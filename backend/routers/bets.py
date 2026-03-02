from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Thesis, Bet
from ..schemas import BetCreate, BetUpdate, BetOut
from ..services.market_service import fetch_ticker_price

router = APIRouter(tags=["bets"])


def _bet_to_out(bet: Bet, db: Session) -> BetOut:
    # Fetch current price
    current = fetch_ticker_price(db, bet.ticker) if bet.ticker else None
    pnl = None
    if current and bet.entry_price and bet.entry_price > 0:
        if bet.direction == "long":
            pnl = round(((current - bet.entry_price) / bet.entry_price) * 100, 2)
        else:
            pnl = round(((bet.entry_price - current) / bet.entry_price) * 100, 2)

    return BetOut(
        id=bet.id,
        thesis_id=bet.thesis_id,
        ticker=bet.ticker,
        direction=bet.direction,
        entry_price=bet.entry_price,
        current_price=current or bet.current_price,
        target_price=bet.target_price,
        stop_loss=bet.stop_loss,
        position_size_pct=bet.position_size_pct,
        status=bet.status,
        notes=bet.notes,
        pnl_pct=pnl,
        created_at=bet.created_at,
    )


@router.get("/api/theses/{thesis_id}/bets", response_model=list[BetOut])
def list_bets(thesis_id: int, db: Session = Depends(get_db)):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=404, detail="Thesis not found")

    bets = db.query(Bet).filter(Bet.thesis_id == thesis_id).all()
    return [_bet_to_out(b, db) for b in bets]


@router.post("/api/theses/{thesis_id}/bets", response_model=BetOut)
def create_bet(thesis_id: int, data: BetCreate, db: Session = Depends(get_db)):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=404, detail="Thesis not found")

    bet = Bet(
        thesis_id=thesis_id,
        ticker=data.ticker,
        direction=data.direction,
        entry_price=data.entry_price,
        target_price=data.target_price,
        stop_loss=data.stop_loss,
        position_size_pct=data.position_size_pct,
        status=data.status,
        notes=data.notes,
    )
    db.add(bet)
    db.commit()
    db.refresh(bet)
    return _bet_to_out(bet, db)


@router.put("/api/bets/{bet_id}", response_model=BetOut)
def update_bet(bet_id: int, data: BetUpdate, db: Session = Depends(get_db)):
    bet = db.query(Bet).filter(Bet.id == bet_id).first()
    if not bet:
        raise HTTPException(status_code=404, detail="Bet not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(bet, field, value)

    db.commit()
    db.refresh(bet)
    return _bet_to_out(bet, db)


@router.delete("/api/bets/{bet_id}")
def delete_bet(bet_id: int, db: Session = Depends(get_db)):
    bet = db.query(Bet).filter(Bet.id == bet_id).first()
    if not bet:
        raise HTTPException(status_code=404, detail="Bet not found")
    db.delete(bet)
    db.commit()
    return {"ok": True}
