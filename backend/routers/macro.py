from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas import MacroRegime
from ..services.fred_service import get_macro_regime

router = APIRouter(prefix="/api/regime", tags=["macro"])


@router.get("/current", response_model=MacroRegime)
def current_regime(db: Session = Depends(get_db)):
    return get_macro_regime(db)
