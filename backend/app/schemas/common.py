from typing import Annotated

from email_validator import EmailNotValidError, validate_email
from pydantic import AfterValidator, BaseModel, ConfigDict


def validate_clinic_email(value: str) -> str:
    """Validate email syntax while accepting the reserved .test sample domain."""
    try:
        domain = value.rsplit('@', 1)[-1].lower()
        return validate_email(
            value,
            check_deliverability=False,
            test_environment=domain.endswith('.test'),
        ).normalized
    except EmailNotValidError as error:
        raise ValueError(str(error)) from error


ClinicEmail = Annotated[str, AfterValidator(validate_clinic_email)]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    message: str
