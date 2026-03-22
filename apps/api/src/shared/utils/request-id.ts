const REQUEST_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

export const resolveRequestId = (value: string | string[] | undefined): string | undefined => {
  if (typeof value === 'string') {
    if (REQUEST_ID_REGEX.test(value)) {
      return value;
    }
    return undefined;
  }

  if (Array.isArray(value) && value.length > 0) {
    const firstValue = value[0];
    if (typeof firstValue === 'string' && REQUEST_ID_REGEX.test(firstValue)) {
      return firstValue;
    }
    return undefined;
  }

  return undefined;
};
