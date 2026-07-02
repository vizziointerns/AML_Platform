from fastapi import APIRouter, Depends, Query
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.project import Project

router = APIRouter()


@router.get("/projects", response_model=list[Project])
def get_projects(
    sort: str = Query("lastUpdated", description="Field to sort by"),
    order: str = Query("desc", description="Sort order: asc or desc"),
    limit: int = Query(4, ge=1, le=100, description="Max number of projects"),
    db: Session = Depends(get_db),
) -> list[Project]:
    if not inspect(db.get_bind()).has_table("projects"):
        return []

    from sqlalchemy import text as sql_text

    direction = "DESC" if order.lower() == "desc" else "ASC"
    allowed_cols = {
        "lastupdated": '"lastUpdated"',
        "name": "name",
        "created_at": "created_at",
        "status": "status",
    }
    col = allowed_cols.get(sort.lower(), allowed_cols["lastupdated"])

    stmt = sql_text(
        f'SELECT id, name, type, status, "datasetCount", "annotationProgress", '
        f'members, "lastUpdated", created_at '
        f"FROM projects ORDER BY {col} {direction} LIMIT :lim"
    )
    rows = db.execute(stmt, {"lim": limit}).mappings().all()
    result: list[Project] = []
    for row in rows:
        data = dict(row)
        if isinstance(data.get("members"), str):
            import json

            data["members"] = json.loads(data["members"])
        result.append(Project(**data))
    return result
