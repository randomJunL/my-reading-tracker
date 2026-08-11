import uuid

from sqlalchemy.orm import Session

from app.models import Reader
from app.repositories.readers import ReaderRepository
from app.schemas.readers import ReaderCreate, ReaderUpdate


class ReaderNotFoundError(Exception):
    pass


class ReaderHistoryConflictError(Exception):
    pass


class ReaderService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = ReaderRepository(session)

    def list(self, household_id: uuid.UUID) -> list[Reader]:
        return self.repository.list_for_household(household_id)

    def get(self, reader_id: uuid.UUID, household_id: uuid.UUID) -> Reader:
        reader = self.repository.get_for_household(reader_id, household_id)
        if reader is None:
            raise ReaderNotFoundError
        return reader

    def create(self, household_id: uuid.UUID, data: ReaderCreate) -> Reader:
        reader = Reader(household_id=household_id, **data.model_dump())
        self.repository.add(reader)
        self.session.commit()
        self.session.refresh(reader)
        return reader

    def update(
        self, reader_id: uuid.UUID, household_id: uuid.UUID, data: ReaderUpdate
    ) -> Reader:
        reader = self.get(reader_id, household_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(reader, field, value)
        self.session.commit()
        self.session.refresh(reader)
        return reader

    def delete(
        self,
        reader_id: uuid.UUID,
        household_id: uuid.UUID,
        *,
        confirm_history: bool,
    ) -> None:
        reader = self.get(reader_id, household_id)
        if self.repository.has_history(reader.id) and not confirm_history:
            raise ReaderHistoryConflictError
        self.repository.delete(reader)
        self.session.commit()
