import { forwardRef, useId } from 'react';
import { Spinner } from './Spinner';

const variantStyles = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: '',
  lg: 'px-6 py-3 text-base',
};

export const Button = forwardRef(function Button(
  {
    as: Component = 'button',
    type = 'button',
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    className = '',
    children,
    leftIcon,
    rightIcon,
    spinnerSize = 16,
    ...props
  },
  ref
) {
  const base = variantStyles[variant] || variantStyles.primary;
  const sz = sizeStyles[size] || sizeStyles.md;
  const isDisabled = disabled || loading;

  return (
    <Component
      ref={ref}
      type={Component === 'button' ? type : undefined}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`${base} ${sz} ${className}`}
      {...props}
    >
      {loading ? <Spinner size={spinnerSize} /> : leftIcon}
      {children && <span>{children}</span>}
      {!loading && rightIcon}
    </Component>
  );
});

export const TextField = forwardRef(function TextField(
  {
    id,
    label,
    error,
    hint,
    name,
    type = 'text',
    inputClassName = '',
    className = '',
    placeholder,
    required = false,
    disabled = false,
    leftIcon,
    rightIcon,
    wrapperRef,
    ...props
  },
  ref
) {
  const autoId = useId();
  const inputId = id || `field-${autoId}`;
  const errId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <div ref={wrapperRef} className={`w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="label-base">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          aria-errormessage={errId}
          aria-describedby={[hintId].filter(Boolean).join(' ') || undefined}
          required={required}
          autoComplete="off"
          className={`input-base ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''} ${error ? 'input-error' : ''} ${disabled ? 'cursor-not-allowed opacity-60' : ''} ${inputClassName}`}
          {...props}
        />
        {rightIcon && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
            {rightIcon}
          </div>
        )}
      </div>
      {error ? (
        <p id={errId} role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export const SelectField = forwardRef(function SelectField(
  {
    id,
    label,
    error,
    hint,
    name,
    options = [],
    placeholder = 'Select...',
    className = '',
    inputClassName = '',
    disabled = false,
    required = false,
    loading = false,
    emptyLabel = 'No options available',
    value,
    defaultValue = '',
    ...props
  },
  ref
) {
  const autoId = useId();
  const inputId = id || `field-${autoId}`;
  const hasEmptyOption = options.some((opt) => opt && opt.value === '');
  const selectProps = {
    ref,
    id: inputId,
    name,
    disabled: disabled || loading,
    'aria-invalid': Boolean(error) || undefined,
    required,
    className: `input-base appearance-none pr-10 ${error ? 'input-error' : ''} ${disabled ? 'cursor-not-allowed opacity-60' : ''} ${inputClassName}`,
    ...props,
  };

  if (value !== undefined) {
    selectProps.value = value;
  } else {
    selectProps.defaultValue = defaultValue || '';
  }

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="label-base">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <select {...selectProps}>
          {!hasEmptyOption && (
            <option value="" disabled>
              {loading ? 'Loading...' : placeholder}
            </option>
          )}
          {!loading && options.length === 0 && (
            <option value="" disabled>
              {emptyLabel}
            </option>
          )}
          {options.map((opt, index) => (
            <option key={`${opt.value}-${index}`} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
});
