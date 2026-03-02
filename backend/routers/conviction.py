from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Thesis, ConvictionEntry
from ..schemas import ConvictionCreate, ConvictionOut

router = APIRouter(prefix="/api/theses/{thesis_id}/conviction", tags=["conviction"])


@router.get("", response_model=list[ConvictionOut])
def list_conviction(thesis_id: int, db: Session = Depends(get_db)):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=404, detail="Thesis not found")

    entries = db.query(ConvictionEntry).filter(
        ConvictionEntry.thesis_id == thesis_id
    ).order_by(ConvictionEntry.date.asc()).all()

    return entries


@router.post("", response_model=ConvictionOut)
def add_conviction(thesis_id: int, data: ConvictionCreate, db: Session = Depends(get_db)):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=404, detail="Thesis not found")

    entry = ConvictionEntry(
        thesis_id=thesis_id,
        score=max(0, min(10, data.score)),
        note=data.note,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}")
def delete_conviction(thesis_id: int, entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(ConvictionEntry).filter(
        ConvictionEntry.id == entry_id,
        ConvictionEntry.thesis_id == thesis_id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"ok": True}
