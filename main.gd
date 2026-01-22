extends Control

const EMAIL_GENERATOR := preload("res://email_generator.gd")
const DEFAULT_DIFFICULTIES: Array[int] = [10, 10]

@onready var main_ui: Control = $Margin
@onready var success_screen: Control = %SuccessScreen
@onready var day_label: Label = %DayLabel
@onready var success_total_label: Label = %SuccessTotalLabel
@onready var next_day_button: Button = %NextDayButton

@onready var from_label: Label = %FromLabel
@onready var subject_label: Label = %SubjectLabel
@onready var classification_label: Label = %ClassificationLabel
@onready var bonus_label: Label = %BonusLabel
@onready var email_body: RichTextLabel = %EmailBody
@onready var decision_label: Label = %DecisionLabel
@onready var total_earned_label: Label = %TotalEarnedLabel
@onready var accept_button: Button = %AcceptButton
@onready var deny_button: Button = %DenyButton
@onready var quarantine_button: Button = %QuarantineButton

var day := 1
var total_bonus_eur := 0
var inbox_template: Array[Dictionary] = []
var inbox: Array[Dictionary] = []
var current_index := 0
var current_bonus_eur := 0
var current_classification_key := "unknown"

func _ready() -> void:
	accept_button.pressed.connect(func() -> void: _handle_decision("Accepted"))
	deny_button.pressed.connect(func() -> void: _handle_decision("Denied"))
	quarantine_button.pressed.connect(func() -> void: _handle_decision("Quarantined"))
	next_day_button.pressed.connect(_start_next_day)
	set_inbox(_generate_inbox(DEFAULT_DIFFICULTIES))

func set_inbox(emails: Array) -> void:
	inbox_template.clear()
	for email in emails:
		if email is Dictionary:
			inbox_template.append(email)
	_start_inbox_from_template()

func _generate_inbox(difficulties: Array[int]) -> Array[Dictionary]:
	var generated: Array[Dictionary] = []
	for difficulty in difficulties:
		generated.append(EMAIL_GENERATOR.generate_email(difficulty))
	return generated

func set_email(from_address: String, subject: String, body: String, classification: String, bonus_eur: int) -> void:
	from_label.text = "From: %s" % from_address
	subject_label.text = "Subject: %s" % subject
	email_body.text = body
	current_classification_key = _classification_key(classification)
	classification_label.text = "Classification: %s" % _classification_display(current_classification_key)
	bonus_label.text = "Bonus: €%d" % bonus_eur
	current_bonus_eur = bonus_eur

func _start_inbox_from_template() -> void:
	inbox.clear()
	inbox.append_array(inbox_template)
	current_index = 0
	if inbox.is_empty():
		_show_success()
		return
	_show_main_ui()
	_show_email(inbox[current_index])

func _show_email(email: Dictionary) -> void:
	set_email(
		email.get("from_address", "unknown@local"),
		email.get("subject", "(No subject)"),
		email.get("body", ""),
		email.get("classification", "unknown"),
		int(email.get("bonus_eur", 0))
	)
	_set_decision("No decision yet")

func _handle_decision(state: String) -> void:
	_set_decision(state)
	if _decision_matches_classification(state, current_classification_key):
		total_bonus_eur += current_bonus_eur
	_update_total_earned()
	current_index += 1
	if current_index >= inbox.size():
		_show_success()
	else:
		_show_email(inbox[current_index])

func _update_total_earned() -> void:
	total_earned_label.text = "Total earned: €%d" % total_bonus_eur

func _show_success() -> void:
	main_ui.visible = false
	success_screen.visible = true
	day_label.text = "Day %d done" % day
	success_total_label.text = "Total earned: €%d" % total_bonus_eur
	day += 1

func _show_main_ui() -> void:
	main_ui.visible = true
	success_screen.visible = false
	_update_total_earned()

func _classification_key(value: String) -> String:
	var cleaned := value.strip_edges().to_lower()
	match cleaned:
		"malicious":
			return "malicious"
		"suspicious":
			return "suspicious"
		"benevolent":
			return "benevolent"
		_:
			return "unknown"

func _classification_display(key: String) -> String:
	match key:
		"malicious":
			return "Malicious"
		"suspicious":
			return "Suspicious"
		"benevolent":
			return "Benevolent"
		_:
			return "Unknown"

func _decision_matches_classification(decision: String, classification_key: String) -> bool:
	match decision:
		"Accepted":
			return classification_key == "benevolent"
		"Denied":
			return classification_key == "malicious"
		"Quarantined":
			return classification_key == "suspicious"
		_:
			return false

func _set_decision(state: String) -> void:
	decision_label.text = "Decision: %s" % state

func _start_next_day() -> void:
	set_inbox(_generate_inbox(DEFAULT_DIFFICULTIES))
