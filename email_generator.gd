extends RefCounted

const EMAIL_FROM := "security@portcullis-mail.com"
const EMAIL_SUBJECT := "Password reset verification"
const EMAIL_BODY := (
	"Hello,\n"
	+ "We detected a sign-in attempt from a new device. If this was you, confirm your\n"
	+ "password reset with the attached link before 5:00 PM today.\n"
	+ "\n"
	+ "Thank you,\n"
	+ "Portcullis Security Team"
)
const EMAIL_CLASSIFICATION := "malicious"

static func generate_email(difficulty: int) -> Dictionary:
	return {
		"from_address": EMAIL_FROM,
		"subject": EMAIL_SUBJECT,
		"body": EMAIL_BODY,
		"classification": EMAIL_CLASSIFICATION,
		"bonus_eur": difficulty
	}
