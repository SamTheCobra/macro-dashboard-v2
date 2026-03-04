import os
import json
import anthropic
from sqlalchemy.orm import Session
from ..models import Thesis, TreeNode, NodeTicker, StartupIdea


SYSTEM_PROMPT = """You are a macro investment analyst and first-principles thinker.
You analyze macroeconomic theses by tracing causal chains from root causes to investable consequences.
You think in terms of second-order and third-order effects, always asking "and then what?"
You identify both public equity tickers and startup opportunities at each node of the causal tree.
You are rigorous, contrarian when warranted, and focused on actionable insights."""


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
- Ticker rationale must be a concise one-line description: what the company/ETF is + why it's relevant to THIS specific effect
  Example: "Largest US bank, benefits directly from wider net interest margins"
  Example: "Regional bank ETF, most leveraged to yield curve steepening"
  NOT: "Benefits from this trend" (too generic)
- Keywords should be search terms useful for finding relevant news articles
- Be specific and actionable, not generic
- Startup idea names should be catchy, colloquial brand names (like "AppetiteTrack", "GridLeap", "ProofLayer")
- Startup idea descriptions must be specific one-line pitches explaining WHAT the product does and WHO it's for
  Example: "GLP-1 meal planning app that adjusts portions as appetite changes on Ozempic/Wegovy"
  NOT: "A platform for health optimization" (too generic)"""

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
