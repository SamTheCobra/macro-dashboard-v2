import os
import json
import anthropic
from sqlalchemy.orm import Session
from ..models import Thesis, TreeNode, NodeTicker, StartupIdea


SYSTEM_PROMPT = """You are a sharp, opinionated macro investor who explains ideas like a smart friend at a bar.
You trace causal chains from root causes to investable consequences, always asking "and then what?"
You identify both public equity tickers and startup opportunities at each node of the causal tree.

WRITING STYLE — THIS IS CRITICAL:
- Write in a casual, conversational tone. No jargon, no buzzwords, no academic language.
- Be specific and concrete, not abstract. Name real companies, real products, real trends.
- Card titles should be 5-10 words, punchy, and immediately clear what the bet is.
- Descriptions should be 2-3 sentences max, plain English, like you're texting a friend.
- Ticker descriptions should say what the company actually DOES and why you care RIGHT NOW.
- Startup ideas should sound like real pitch deck names with a clear one-liner.

BAD (too academic/formal):
- Title: "Agricultural Commodity Shifts"
- Description: "Reduced overall food consumption leads to lower demand for commodity crops used in processed foods"
- Ticker desc: "Benefits directly from wider net interest margins"
- Startup: "YieldSignal — Analytics dashboard for yield curve indicators"

GOOD (casual, punchy, specific):
- Title: "Farmers Get Wrecked as America Stops Eating"
- Description: "Everyone on Ozempic means less Doritos, less corn syrup, less everything. Commodity crop demand craters while high-protein clean food demand explodes."
- Ticker desc: "Makes Ozempic — literally printing money right now"
- Startup: "CurveAlert — Pings you when the yield curve moves so you can front-run the banks"
"""


def generate_thesis_tree(thesis_statement: str) -> dict:
    """Call Claude to expand a thesis statement into a full causal tree."""
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    user_prompt = f"""Given this macro investment thesis:
"{thesis_statement}"

Generate a complete causal analysis tree. Return ONLY valid JSON with this exact structure:
{{
    "description": "A 2-3 sentence expanded description of the thesis",
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
    "second_order_effects": [
        {{
            "label": "Short label for the effect",
            "description": "Detailed description of this second-order effect",
            "tickers": [
                {{"symbol": "TICK", "rationale": "One-line description: what this company/ETF is and why it's relevant here", "direction": "long"}},
                {{"symbol": "TICK2", "rationale": "One-line description: what this company/ETF is and why it's relevant here", "direction": "long"}},
                {{"symbol": "TICK3", "rationale": "One-line description: what this company/ETF is and why it's relevant here", "direction": "long"}}
            ],
            "startup_ideas": [
                {{"name": "CatchyBrandName", "description": "One-line plain-English pitch of what this startup builds and for whom"}},
                {{"name": "AnotherName", "description": "One-line pitch explaining the product and why it's timely"}},
                {{"name": "ThirdName", "description": "One-line pitch — be specific, not generic"}}
            ],
            "third_order_effects": [
                {{
                    "label": "Short label for 3rd order effect",
                    "description": "Detailed description",
                    "tickers": [
                        {{"symbol": "TICK", "rationale": "One-line: what this is and why it's relevant", "direction": "long"}},
                        {{"symbol": "TICK2", "rationale": "One-line: what this is and why it's relevant", "direction": "long"}},
                        {{"symbol": "TICK3", "rationale": "One-line: what this is and why it's relevant", "direction": "short"}}
                    ],
                    "startup_ideas": [
                        {{"name": "BrandName", "description": "One-line pitch of what it builds and for whom"}},
                        {{"name": "BrandName2", "description": "Specific one-line pitch"}},
                        {{"name": "BrandName3", "description": "Specific one-line pitch"}}
                    ]
                }},
                {{
                    "label": "Another 3rd order effect",
                    "description": "Description",
                    "tickers": [
                        {{"symbol": "TICK", "rationale": "One-line: what this is and why it's relevant", "direction": "long"}},
                        {{"symbol": "TICK2", "rationale": "One-line: what this is and why it's relevant", "direction": "long"}},
                        {{"symbol": "TICK3", "rationale": "One-line: what this is and why it's relevant", "direction": "long"}}
                    ],
                    "startup_ideas": [
                        {{"name": "BrandName", "description": "One-line pitch of what it builds and for whom"}},
                        {{"name": "BrandName2", "description": "Specific one-line pitch"}},
                        {{"name": "BrandName3", "description": "Specific one-line pitch"}}
                    ]
                }},
                {{
                    "label": "Third 3rd order effect",
                    "description": "Description",
                    "tickers": [
                        {{"symbol": "TICK", "rationale": "One-line: what this is and why it's relevant", "direction": "long"}},
                        {{"symbol": "TICK2", "rationale": "One-line: what this is and why it's relevant", "direction": "long"}},
                        {{"symbol": "TICK3", "rationale": "One-line: what this is and why it's relevant", "direction": "long"}}
                    ],
                    "startup_ideas": [
                        {{"name": "BrandName", "description": "One-line pitch of what it builds and for whom"}},
                        {{"name": "BrandName2", "description": "Specific one-line pitch"}},
                        {{"name": "BrandName3", "description": "Specific one-line pitch"}}
                    ]
                }}
            ]
        }}
    ]
}}

IMPORTANT:
- Generate exactly 3 second-order effects
- Each second-order effect must have exactly 3 third-order effects (nested under it, NOT flat)
- Each effect (both 2nd and 3rd order) must have exactly 3 tickers and 3 startup ideas
- Tickers should be real, tradeable US equity or ETF symbols
- Direction should be "long" if the thesis benefits the ticker, "short" if it hurts it
- Ticker rationale: say what the company/ETF actually IS and why you'd care RIGHT NOW, in plain English
  GOOD: "Makes Ozempic — literally printing money right now"
  GOOD: "Regional banks ETF, gets murdered when the curve inverts"
  BAD: "Benefits from this macro trend" (too generic, says nothing)
- Keywords should be search terms useful for finding relevant news articles
- TONE: Write like a smart friend, not a Wall Street report. Be specific, punchy, and opinionated.
- Card titles: 5-10 words, punchy. "Banks Finally Catch a Break" not "Financial Sector Normalization"
- Descriptions: 2-3 sentences, plain English, concrete. Name real products and companies.
- Startup names should sound like REAL startups — catchy brand names (like "CurveAlert", "AppetiteTrack", "GridLeap")
- Startup descriptions: one-liner that makes you go "oh that's clever"
  GOOD: "Pings you when the yield curve moves so you can front-run the banks"
  GOOD: "GLP-1 meal planning app that adjusts portions as your appetite changes on Ozempic"
  BAD: "A platform for health optimization" (boring, says nothing)"""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=8000,
        messages=[{"role": "user", "content": user_prompt}],
        system=SYSTEM_PROMPT,
    )

    response_text = message.content[0].text

    # Extract JSON from response (handle markdown code blocks)
    if "```json" in response_text:
        response_text = response_text.split("```json")[1].split("```")[0]
    elif "```" in response_text:
        response_text = response_text.split("```")[1].split("```")[0]

    return json.loads(response_text.strip())


def store_thesis_tree(db: Session, thesis: Thesis, tree_data: dict) -> None:
    """Store the AI-generated tree into the database."""
    thesis.description = tree_data.get("description", "")
    thesis.keywords = tree_data.get("keywords", [])

    # Create root thesis node
    root_node = TreeNode(
        thesis_id=thesis.id,
        parent_id=None,
        node_type="thesis",
        label=thesis.title,
        description=thesis.description,
        sort_order=0,
    )
    db.add(root_node)
    db.flush()

    for i, soe in enumerate(tree_data.get("second_order_effects", [])):
        so_node = TreeNode(
            thesis_id=thesis.id,
            parent_id=root_node.id,
            node_type="second_order",
            label=soe["label"],
            description=soe.get("description", ""),
            sort_order=i,
        )
        db.add(so_node)
        db.flush()

        for ticker_data in soe.get("tickers", []):
            db.add(NodeTicker(
                node_id=so_node.id,
                symbol=ticker_data["symbol"],
                rationale=ticker_data.get("rationale", ""),
                direction=ticker_data.get("direction", "long"),
            ))

        for idea_data in soe.get("startup_ideas", []):
            db.add(StartupIdea(
                node_id=so_node.id,
                name=idea_data["name"],
                description=idea_data.get("description", ""),
            ))

        for j, toe in enumerate(soe.get("third_order_effects", [])):
            to_node = TreeNode(
                thesis_id=thesis.id,
                parent_id=so_node.id,
                node_type="third_order",
                label=toe["label"],
                description=toe.get("description", ""),
                sort_order=j,
            )
            db.add(to_node)
            db.flush()

            for ticker_data in toe.get("tickers", []):
                db.add(NodeTicker(
                    node_id=to_node.id,
                    symbol=ticker_data["symbol"],
                    rationale=ticker_data.get("rationale", ""),
                    direction=ticker_data.get("direction", "long"),
                ))

            for idea_data in toe.get("startup_ideas", []):
                db.add(StartupIdea(
                    node_id=to_node.id,
                    name=idea_data["name"],
                    description=idea_data.get("description", ""),
                ))

    db.commit()


def classify_headline(headline: str, thesis_title: str) -> dict:
    """Classify a news headline as confirming/neutral/contradicting relative to a thesis."""
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=300,
        messages=[{"role": "user", "content": f"""Given the macro investment thesis: "{thesis_title}"

Classify this news headline and provide a one-line summary of its relevance:
"{headline}"

Return ONLY valid JSON:
{{"classification": "confirming|neutral|contradicting", "summary": "One sentence explaining relevance to the thesis"}}"""}],
        system="You are a macro investment analyst. Classify news headlines relative to investment theses. Be precise and brief.",
    )

    text = message.content[0].text
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]

    return json.loads(text.strip())
