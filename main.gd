extends Control

@onready var from_label: Label = %FromLabel
@onready var subject_label: Label = %SubjectLabel
@onready var classification_label: Label = %ClassificationLabel
@onready var email_body: RichTextLabel = %EmailBody
@onready var decision_label: Label = %DecisionLabel
@onready var accept_button: Button = %AcceptButton
@onready var deny_button: Button = %DenyButton
@onready var quarantine_button: Button = %QuarantineButton

func _ready() -> void:
	accept_button.pressed.connect(func() -> void: _set_decision("Accepted"))
	deny_button.pressed.connect(func() -> void: _set_decision("Denied"))
	quarantine_button.pressed.connect(func() -> void: _set_decision("Quarantined"))
	_set_decision("No decision yet")
	set_email(
		"security@portcullis-mail.com",
		"Password reset verification",
		"Hello,\n"
		+ "We detected a sign-in attempt from a new device. If this was you, confirm your\n"
		+ "password reset with the attached link before 5:00 PM today.\n"
		+ "\n"
		+ "Thank you,\n"
		+ "Portcullis Security Team",
		"Malicious"
	)

func set_email(from_address: String, subject: String, body: String, classification: String) -> void:
	from_label.text = "From: %s" % from_address
	subject_label.text = "Subject: %s" % subject
	email_body.text = body
	classification_label.text = "Classification: %s" % _normalize_classification(classification)

func _normalize_classification(value: String) -> String:
	var cleaned := value.strip_edges().to_lower()
	match cleaned:
		"malicious":
			return "Malicious"
		"suspicious":
			return "Suspicious"
		"benevolent":
			return "Benevolent"
		_:
			return "Unknown"

func _set_decision(state: String) -> void:
	decision_label.text = "Decision: %s" % state
