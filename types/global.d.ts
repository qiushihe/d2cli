/**
 * This generic type is used to indicate that a particular generic parameter
 * must always be explicitly specified, and should never be left to be inferred
 * by TypeScript.
 *
 * To use `NoInfer<T>`, the `T` must have a default value of `never`.
 *
 * For example:
 *
 * ```
 * const myFunc = <T = never>(arg: NoInfer<T>) => { ... };
 * ```
 */
type NoInfer<T> = [
  T,
  "Generic typing for parameter with ‹NoInfer› must be explicitly providedǃ"
][T extends any ? 0 : 1];
