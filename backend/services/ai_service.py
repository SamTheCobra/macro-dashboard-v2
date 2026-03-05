import os
import re
import json
import logging
import anthropic
from sqlalchemy.orm import Session
from ..models import Thesis, TreeNode, NodeTicker, StartupIdea

logger = logging.getLogger(__name__)


def _clean_json_response(text: str) -> str:
    """Strip markdown fences and fix common JSON issues from AI responses."""
    # Strip markdown code fences
    text = text.strip()
    if text.startswith("```"):
        # Remove opening fence (with optional language tag)
        text = re.sub(r'^```(?:json)?\s*\n?', '', text)
        # Remove closing fence
        text = re.sub(r'\n?```\s*$', '', text)

    # Remove trailing commas before } and ]
    text = re.sub(r',\s*([}\]])', r'\1', text)

    return text.strip()


SYSTEM_PROMPT = """You are a sharp, opinionated macro investor who explains ideas like a smart friend at a bar.
You trace causal chains from root causes to investable consequences, always asking "and then what?"
You identify both public equity tickers and startup opportunities at each node of the causal tree.

WRITING STYLE — THIS IS CRITICAL:
- Write in a casual, conversational tone. No jargon, no buzzwords, no academic language.
- Be specific and concrete, not abstract. Name real companies, real products, real trends.
- Card titles should be 5-10 words, punchy, and immediately clear what the bet is.
- Descriptions should be 2-3 sentences max, plain English, like you're texting a friend.
- Ticker descriptions should name the company's specific product/asset/revenue driver and explain the exact causal link to the thesis — not generic phrases like "benefits from this trend".
- Startup ideas should sound like real pitch deck names with a clear one-liner.

BAD (too academic/formal):
- Title: "Agricultural Commodity Shifts"
- Description: "Reduced overall food consumption leads to lower demand for commodity crops used in processed foods"
- Ticker desc: "Benefits directly from wider net interest margins" (no specifics about which company or why)
- Startup: "YieldSignal — Analytics dashboard for yield curve indicators"

GOOD (casual, punchy, specific):
- Title: "Farmers Get Wrecked as America Stops Eating"
- Description: "Everyone on Ozempic means less Doritos, less corn syrup, less everything. Commodity crop demand craters while high-protein clean food demand explodes."
- Ticker desc: "NVO makes Ozempic — GLP-1 scripts doubled in 2024 and they own 60% market share, this is a direct play on the obesity drug boom"
- Startup: "CurveAlert — Pings you when the yield curve moves so you can front-run the banks"
"""


def _call_claude_for_tree(client, thesis_statement: str) -> str:
    """Make the API call to Claude and return raw response text."""
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
            "relevant_sector_etf": {{"symbol": "XLK", "rationale": "Sector ETF and why it's the right sector proxy"}},
            "tickers": [
                {{"symbol": "TICK", "rationale": "Name the company's specific product/asset, then explain the causal link to this node's effect", "direction": "long"}},
                {{"symbol": "TICK2", "rationale": "Name the company's specific product/asset, then explain the causal link to this node's effect", "direction": "long"}},
                {{"symbol": "TICK3", "rationale": "Name the company's specific product/asset, then explain the causal link to this node's effect", "direction": "long"}}
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
                    "relevant_sector_etf": {{"symbol": "XLF", "rationale": "Sector ETF and why"}},
                    "tickers": [
                        {{"symbol": "TICK", "rationale": "Name the specific product/asset/revenue and explain the causal link to this effect", "direction": "long"}},
                        {{"symbol": "TICK2", "rationale": "Name the specific product/asset/revenue and explain the causal link to this effect", "direction": "long"}},
                        {{"symbol": "TICK3", "rationale": "Name the specific product/asset/revenue and explain the causal link to this effect", "direction": "short"}}
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
                    "relevant_sector_etf": {{"symbol": "XLE", "rationale": "Sector ETF and why"}},
                    "tickers": [
                        {{"symbol": "TICK", "rationale": "Name the specific product/asset/revenue and explain the causal link to this effect", "direction": "long"}},
                        {{"symbol": "TICK2", "rationale": "Name the specific product/asset/revenue and explain the causal link to this effect", "direction": "long"}},
                        {{"symbol": "TICK3", "rationale": "Name the specific product/asset/revenue and explain the causal link to this effect", "direction": "long"}}
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
                    "relevant_sector_etf": {{"symbol": "XLV", "rationale": "Sector ETF and why"}},
                    "tickers": [
                        {{"symbol": "TICK", "rationale": "Name the specific product/asset/revenue and explain the causal link to this effect", "direction": "long"}},
                        {{"symbol": "TICK2", "rationale": "Name the specific product/asset/revenue and explain the causal link to this effect", "direction": "long"}},
                        {{"symbol": "TICK3", "rationale": "Name the specific product/asset/revenue and explain the causal link to this effect", "direction": "long"}}
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
- Each effect (both 2nd and 3rd order) must have exactly 3 tickers, 3 startup ideas, and 1 relevant_sector_etf
- relevant_sector_etf should be a SPDR sector ETF (XLK, XLF, XLV, XLE, XLP, XLY, XLI, XLB, XLU, XLRE, XLC) that best represents the sector for that effect
- Tickers should be real, tradeable US equity or ETF symbols
- Direction should be "long" if the thesis benefits the ticker, "short" if it hurts it
- Ticker rationale: MUST explain the SPECIFIC causal link between THIS thesis node and THIS company's business.
  Name the company's actual product/asset/revenue driver, then connect it to the effect described in this node.
  GOOD: "WELL owns 1,500+ senior housing properties and occupancy rates rise directly with boomer aging — this is their core business."
  GOOD: "NVO makes Ozempic — literally printing money as GLP-1 prescriptions double every year"
  GOOD: "KRE is 80% regional banks that hold long-duration bonds, so when the curve inverts their portfolios get crushed"
  BAD: "Benefits from this macro trend" (too generic, says nothing)
  BAD: "Well-positioned to capitalize on these dynamics" (empty phrase, no specifics)
  BAD: "Stands to gain from increased demand" (gain HOW? demand for WHAT specifically?)
- Keywords should be search terms useful for finding relevant news articles
- TONE: Write like a smart friend, not a Wall Street report. Be specific, punchy, and opinionated.
- Card titles: 5-10 words, punchy. "Banks Finally Catch a Break" not "Financial Sector Normalization"
- Descriptions: 2-3 sentences, plain English, concrete. Name real products and companies.
- Each startup idea must be a REAL plausible business, not a generic SaaS name. Think Y Combinator pitch deck quality.
- Startup names: 1-2 words, punchy, lowercase-friendly, memorable (like "CurveAlert", "TinyFeast", "ClaimFlip")
- Startup descriptions: 1 sentence with a specific detail (price point, metric, or customer)
  BAD: "PortionPerfect — GLP-1-optimized meal delivery service with micro-portions designed for appetite-suppressed users"
  GOOD: "TinyFeast — $8/day meal kit for people on Ozempic. Half the calories, twice the protein, fits in a lunchbox."
  BAD: "WeightWise — Insurance analytics platform that calculates ROI of GLP-1 coverage"
  GOOD: "ClaimFlip — Shows employers they save $11k/year per employee on GLP-1s vs obesity complications. Sells to HR departments."
  BAD: "A platform for health optimization" (boring, says nothing)

Return ONLY the JSON object. No markdown, no code fences, no explanation."""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=8000,
        messages=[{"role": "user", "content": user_prompt}],
        system=SYSTEM_PROMPT,
    )

    return message.content[0].text


def generate_thesis_tree(thesis_statement: str) -> dict:
    """Call Claude to expand a thesis statement into a full causal tree.
    Cleans JSON response and retries once on parse failure."""
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    for attempt in range(2):
        response_text = _call_claude_for_tree(client, thesis_statement)
        cleaned = _clean_json_response(response_text)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            if attempt == 0:
                logger.warning(
                    "JSON parse failed for '%s' (attempt 1), retrying: %s",
                    thesis_statement[:60], e,
                )
            else:
                logger.error(
                    "JSON parse failed for '%s' after retry: %s\nRaw response:\n%s",
                    thesis_statement[:60], e, response_text[:500],
                )
                raise


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

    text = _clean_json_response(message.content[0].text)
    return json.loads(text)
