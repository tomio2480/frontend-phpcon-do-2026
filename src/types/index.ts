export type MunicipalityCode = string

export type SelectionState = Set<MunicipalityCode>

export type AggregatedResult = {
  area: number
  population: number
  furusatoAmount: number
  furusatoCount: number
  areaPct: number
  populationPct: number
  furusatoAmountPct: number
  furusatoCountPct: number
}
