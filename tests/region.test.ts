import { describe, expect, it } from 'vitest'
import bmkg from '../data/bmkg-locations.json'
import provinceFile from '../data/wilayah-provinces.json'
import type { BmkgLocationEntry } from '../.vitepress/theme/kerja/bmkg'
import {
  ISLANDS,
  entriesInIsland,
  formatArea,
  formatPopulation,
  highlightSegments,
  largestCities,
  normalizeRegion,
  provincesForIsland,
  rankRegions,
  shortRegionName,
  type IslandId,
  type ProvinceMeta
} from '../.vitepress/theme/kerja/region'

const provinces = provinceFile.provinces as ProvinceMeta[]

function entry(partial: Partial<BmkgLocationEntry> & { adm4: string; name: string }): BmkgLocationEntry {
  return {
    regency: shortRegionName(partial.name),
    provinceCode: partial.adm4.slice(0, 2),
    province: 'Test Province',
    ...partial
  }
}

const entries: BmkgLocationEntry[] = [
  entry({ adm4: '31.71.01.1001', name: 'Kota Administrasi Jakarta Pusat', population: 1_050_000, kind: 'kota', provinceCode: '31', province: 'DKI Jakarta', capital: 'Jakarta Pusat' }),
  entry({ adm4: '31.73.01.1001', name: 'Kota Bandung', population: 2_400_000, kind: 'kota', provinceCode: '32', province: 'Jawa Barat', capital: 'Bandung' }),
  entry({ adm4: '34.71.01.1001', name: 'Kota Yogyakarta', population: 400_000, kind: 'kota', provinceCode: '34', province: 'DI Yogyakarta', capital: 'Yogyakarta' }),
  entry({ adm4: '11.05.01.2001', name: 'Kabupaten Aceh Barat', population: 209_000, kind: 'kabupaten', provinceCode: '11', province: 'Aceh', capital: 'Meulaboh' }),
  entry({ adm4: '73.71.01.1001', name: 'Kota Makassar', population: 1_400_000, kind: 'kota', provinceCode: '73', province: 'Sulawesi Selatan', capital: 'Makassar' }),
  entry({ adm4: '63.71.01.1001', name: 'Kota Banjarmasin', population: 681_000, kind: 'kota', provinceCode: '63', province: 'Kalimantan Selatan', capital: 'Banjarmasin' }),
  entry({ adm4: '63.72.01.1001', name: 'Kota Banjarbaru', population: 260_000, kind: 'kota', provinceCode: '63', province: 'Kalimantan Selatan', capital: 'Banjarbaru' })
]

describe('region search', () => {
  it('normalizes punctuation, case and accents', () => {
    expect(normalizeRegion('  Kabupaten  Aceh   Barat ')).toBe('kabupaten aceh barat')
    expect(shortRegionName('Kabupaten Kepulauan Siau')).toBe('Kepulauan Siau')
    expect(shortRegionName('Kota Administrasi Jakarta Utara')).toBe('Jakarta Utara')
  })

  it('finds exact names before partial ones', () => {
    const results = rankRegions(entries, 'bandung')
    expect(results[0].entry.name).toBe('Kota Bandung')
    expect(results[0].reason).toBe('name')
  })

  it('understands common nicknames', () => {
    expect(rankRegions(entries, 'jogja')[0].entry.name).toBe('Kota Yogyakarta')
    expect(rankRegions(entries, 'ujung pandang')[0].entry.name).toBe('Kota Makassar')
    expect(rankRegions(entries, 'bjm')[0].entry.name).toBe('Kota Banjarmasin')
    expect(rankRegions(entries, 'jogja kota')[0].entry.name).toBe('Kota Yogyakarta')
  })

  it('matches regency capitals', () => {
    const results = rankRegions(entries, 'meulaboh')
    expect(results[0].entry.name).toBe('Kabupaten Aceh Barat')
    expect(results[0].reason).toBe('capital')
  })

  it('matches province names', () => {
    const results = rankRegions(entries, 'kalimantan selatan')
    expect(results.map((match) => match.entry.name)).toEqual(
      expect.arrayContaining(['Kota Banjarmasin', 'Kota Banjarbaru'])
    )
    expect(results.every((match) => match.entry.province === 'Kalimantan Selatan')).toBe(true)
  })

  it('matches adm4 prefixes', () => {
    const results = rankRegions(entries, '63.71')
    expect(results[0].entry.adm4).toBe('63.71.01.1001')
    expect(results[0].reason).toBe('code')
  })

  it('requires every token of a multi-word query', () => {
    expect(rankRegions(entries, 'kota banjarbaru')).toHaveLength(1)
    expect(rankRegions(entries, 'banjarbaru aceh')).toHaveLength(0)
  })

  it('uses population to break ties', () => {
    const results = rankRegions(entries, 'jakarta')
    expect(results[0].entry.name).toBe('Kota Administrasi Jakarta Pusat')
  })

  it('returns nothing for an empty query', () => {
    expect(rankRegions(entries, '   ')).toEqual([])
  })
})

describe('region browsing', () => {
  it('keeps only the selected island', () => {
    const java = entriesInIsland(entries, 'java')
    expect(java.map((item) => item.provinceCode).sort()).toEqual(['31', '32', '34'])
    expect(entriesInIsland(entries, '')).toHaveLength(entries.length)
  })

  it('filters province metadata by island', () => {
    const java = provincesForIsland(provinces, 'java')
    expect(java.map((province) => province.code)).toEqual(['31', '32', '33', '34', '35', '36'])
    expect(provincesForIsland(provinces, '')).toHaveLength(38)
  })

  it('lists the largest cities first', () => {
    expect(largestCities(entries, 3).map((item) => item.name)).toEqual([
      'Kota Bandung',
      'Kota Makassar',
      'Kota Administrasi Jakarta Pusat'
    ])
  })

  it('formats population and area for Indonesian readers', () => {
    expect(formatPopulation(2_400_000)).toBe('2,4 jt')
    expect(formatPopulation(681_000)).toBe('681 rb')
    expect(formatArea(98.372)).toBe('98,4 km²')
    expect(formatArea(56835.019)).toBe('56.835 km²')
  })

  it('splits labels around the matched text', () => {
    expect(highlightSegments('Banjarmasin', 'banjar')).toEqual([
      { text: 'Banjar', match: true },
      { text: 'masin', match: false }
    ])
    expect(highlightSegments('Aceh', 'zz')).toEqual([{ text: 'Aceh', match: false }])
  })
})

describe('bundled region data', () => {
  it('has all 38 provinces with an island group', () => {
    expect(provinces).toHaveLength(38)
    const islandIds = new Set(ISLANDS.map((island) => island.id))
    expect(provinces.every((province) => islandIds.has(province.island as IslandId))).toBe(true)
  })

  it('places every BMKG point inside Indonesia', () => {
    expect(bmkg.locations).toHaveLength(514)
    for (const location of bmkg.locations) {
      expect(location.lat).toBeTypeOf('number')
      expect(location.lon).toBeTypeOf('number')
      expect(location.lat!).toBeGreaterThan(-12)
      expect(location.lat!).toBeLessThan(7)
      expect(location.lon!).toBeGreaterThan(94)
      expect(location.lon!).toBeLessThan(142)
      expect(location.population).toBeGreaterThan(0)
    }
  })

  it('only uses provinces that exist in the metadata', () => {
    const codes = new Set(provinces.map((province) => province.code))
    expect(bmkg.locations.every((location) => codes.has(location.provinceCode))).toBe(true)
  })
})
