/** A string or number that the type system keeps apart from others of the same shape (`ChapterId` vs `PartId`). */
export type Brand<T, Name extends string> = T & { readonly __brand: Name }
