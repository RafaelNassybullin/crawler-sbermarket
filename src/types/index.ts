

interface Fields {
  name: string,
  label: string
}

export interface Options {
  fields: Fields[]
}

export type MultipleElFunction = (r: number) => string