from pydantic import BaseModel, ConfigDict
from typing import Optional

class CategoryBase(BaseModel):
    name: str
    type: str = "expense" # Default to expense, but should be validated

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None

class CategoryResponse(CategoryBase):
    id: int
    is_default: bool = False

    model_config = ConfigDict(from_attributes=True)
