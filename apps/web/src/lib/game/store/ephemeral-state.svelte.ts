export function createEphemeralState() {
  let hoverEmailId = $state<string | null>(null);
  let hoverButtonId = $state<string | null>(null);
  let focusElementId = $state<string | null>(null);
  let isTransitioning = $state(false);
  let transitionType = $state<'fade' | 'slide' | 'none'>('none');
  let formValues = $state<Record<string, string>>({});
  let formErrors = $state<Record<string, string>>({});
  let formTouched = $state<Record<string, boolean>>({});

  return {
    get hoverEmailId() {
      return hoverEmailId;
    },
    setHoverEmail(id: string | null) {
      hoverEmailId = id;
    },

    get hoverButtonId() {
      return hoverButtonId;
    },
    setHoverButton(id: string | null) {
      hoverButtonId = id;
    },

    get focusElementId() {
      return focusElementId;
    },
    setFocus(id: string | null) {
      focusElementId = id;
    },
    clearFocus() {
      focusElementId = null;
    },

    get isTransitioning() {
      return isTransitioning;
    },
    get transitionType() {
      return transitionType;
    },
    setTransitioning(value: boolean, type: 'fade' | 'slide' | 'none' = 'none') {
      isTransitioning = value;
      transitionType = type;
    },

    get formValues() {
      return formValues;
    },
    get formErrors() {
      return formErrors;
    },
    get formTouched() {
      return formTouched;
    },

    setFormValue(key: string, value: string) {
      formValues = { ...formValues, [key]: value };
      formTouched = { ...formTouched, [key]: true };
    },

    setFormError(key: string, error: string) {
      formErrors = { ...formErrors, [key]: error };
    },

    clearFormError(key: string) {
      const newErrors = { ...formErrors };
      delete newErrors[key];
      formErrors = newErrors;
    },

    resetForm() {
      formValues = {};
      formErrors = {};
      formTouched = {};
    },
  };
}
