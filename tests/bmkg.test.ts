import { describe, expect, it } from 'vitest'
import sample from './fixtures/bmkg-sample.json'
import {
  ADM4_PATTERN,
  isCacheFresh,
  isRainy,
  locationLabel,
  outdoorRainAdvice,
  parseBmkgDateTime,
  parseBmkgForecast,
  searchLocations,
  timezoneOffset,
  toSavedLocation,
  weatherKind,
  type BmkgLocationEntry,
  type Forecast
} from '../.vitepress/theme/kerja/bmkg'
import { createTask } from '../.vitepress/theme/kerja/model'

const parsed = parseBmkgForecast(sample, '2025-10-12T09:00:00.000Z')
const forecast: Forecast = (() => {
  if (!parsed.ok) throw new Error(parsed.error)
  return parsed.forecast
})()

describe('BMKG parsing', () => {
  it('parses the documented response envelope', () => {
    expect(parsed.ok).toBe(true)
    expect(forecast.location.adm4).toBe('31.71.01.1001')
    expect(forecast.location.desa).toBe('Gambir')
    expect(forecast.location.provinsi).toBe('DKI Jakarta')
    expect(forecast.slots.length).toBe(19)
    expect(forecast.days).toHaveLength(3)
    expect(forecast.days.map((day) => day.date)).toEqual([
      '2025-10-12',
      '2025-10-13',
      '2025-10-14'
    ])
  })

  it('keeps the location timezone and absolute UTC timestamp', () => {
    const first = forecast.slots[0]
    expect(first.localTime).toBe('15:00')
    expect(first.localDay).toBe('2025-10-12')
    expect(first.time).toBe('2025-10-12T08:00:00.000Z')
    expect(first.temperature).toBe(32)
    expect(first.humidity).toBe(59)
    expect(first.windSpeed).toBeCloseTo(10.1)
    expect(first.windDirection).toBe('N')
    expect(first.desc).toBe('Cerah Berawan')
    expect(first.kind).toBe('partly')
  })

  it('normalises timezone offsets and local date strings', () => {
    expect(timezoneOffset('+0700')).toBe('+07:00')
    expect(timezoneOffset('+08:00')).toBe('+08:00')
    expect(timezoneOffset('Asia/Jayapura')).toBe('+09:00')
    expect(timezoneOffset('WITA')).toBe('+08:00')
    expect(parseBmkgDateTime('2025-10-12 15:00:00', '+0800')?.time).toBe(
      '2025-10-12T07:00:00.000Z'
    )
    expect(parseBmkgDateTime('nope', '+0700')).toBeNull()
  })

  it('builds a readable location label without duplicates', () => {
    expect(locationLabel(forecast.location)).toBe('Gambir, Kota Adm. Jakarta Pusat, DKI Jakarta')
  })

  it('rejects malformed or empty responses', () => {
    expect(parseBmkgForecast(null).ok).toBe(false)
    expect(parseBmkgForecast({ data: [] }).ok).toBe(false)
    expect(parseBmkgForecast({ lokasi: { adm4: '31.71.01.1001' }, data: [{ cuaca: [] }] }).ok).toBe(
      false
    )
    expect(
      parseBmkgForecast({ error: { message: 'not found' }, lokasi: sample.lokasi }).ok
    ).toBe(false)
  })

  it('de-duplicates repeated slots', () => {
    const duplicated = {
      ...sample,
      data: [{ ...sample.data[0], cuaca: [...sample.data[0].cuaca, ...sample.data[0].cuaca] }]
    }
    const result = parseBmkgForecast(duplicated)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.forecast.slots).toHaveLength(19)
  })
})

describe('weather classification', () => {
  it('maps BMKG codes to icon families', () => {
    expect(weatherKind(0)).toBe('clear')
    expect(weatherKind(2)).toBe('partly')
    expect(weatherKind(3)).toBe('cloudy')
    expect(weatherKind(4)).toBe('overcast')
    expect(weatherKind(45)).toBe('fog')
    expect(weatherKind(5)).toBe('haze')
    expect(weatherKind(61)).toBe('rain')
    expect(weatherKind(63)).toBe('heavy-rain')
    expect(weatherKind(95)).toBe('storm')
    expect(weatherKind(999, 'Hujan Petir')).toBe('storm')
    expect(weatherKind(999, 'something odd')).toBe('unknown')
  })

  it('flags rainy slots by kind or precipitation', () => {
    expect(isRainy({ ...forecast.slots[0], kind: 'rain', precipitationMm: 0 })).toBe(true)
    expect(isRainy({ ...forecast.slots[0], kind: 'clear', precipitationMm: 0.8 })).toBe(true)
    expect(isRainy({ ...forecast.slots[0], kind: 'clear', precipitationMm: 0 })).toBe(false)
  })
})

describe('outdoor task advice', () => {
  const rainy = forecast.slots.find((slot) => isRainy(slot))!

  it('warns when rain overlaps an outdoor task', () => {
    const task = createTask({ title: 'Football', outdoor: true, startAt: rainy.time })
    const advice = outdoorRainAdvice(task, forecast)
    expect(advice).not.toBeNull()
    expect(advice?.slots.length).toBeGreaterThan(0)
    expect(advice?.detail).toContain('Rain')
    expect(['low', 'medium', 'high']).toContain(advice?.severity)
  })

  it('stays silent for indoor tasks, undated tasks and dry forecasts', () => {
    expect(
      outdoorRainAdvice(createTask({ title: 'Indoor', startAt: rainy.time }), forecast)
    ).toBeNull()
    expect(outdoorRainAdvice(createTask({ title: 'No date', outdoor: true }), forecast)).toBeNull()

    const dry: Forecast = {
      ...forecast,
      slots: forecast.slots.map((slot) => ({
        ...slot,
        kind: 'clear',
        precipitationMm: 0,
        desc: 'Cerah'
      }))
    }
    expect(
      outdoorRainAdvice(createTask({ title: 'Park', outdoor: true, startAt: rainy.time }), dry)
    ).toBeNull()
  })

  it('returns null without a forecast', () => {
    expect(
      outdoorRainAdvice(
        createTask({ title: 'Park', outdoor: true, startAt: rainy.time }),
        null
      )
    ).toBeNull()
  })
})

describe('location selection', () => {
  const entries: BmkgLocationEntry[] = [
    {
      adm4: '63.71.01.1001',
      name: 'Kota Banjarmasin',
      regency: 'Banjarmasin',
      provinceCode: '63',
      province: 'Kalimantan Selatan'
    },
    {
      adm4: '32.73.01.1001',
      name: 'Kota Bandung',
      regency: 'Bandung',
      provinceCode: '32',
      province: 'Jawa Barat'
    },
    {
      adm4: '32.04.01.2001',
      name: 'Kabupaten Bandung',
      regency: 'Bandung',
      provinceCode: '32',
      province: 'Jawa Barat'
    }
  ]

  it('finds locations by city, regency or province without guessing', () => {
    expect(searchLocations(entries, 'banjarmasin')[0].adm4).toBe('63.71.01.1001')
    expect(searchLocations(entries, 'bandung').length).toBe(2)
    expect(searchLocations(entries, 'jawa barat').length).toBe(2)
    expect(searchLocations(entries, '   ')).toEqual([])
    expect(searchLocations(entries, 'atlantis')).toEqual([])
  })

  it('validates administrative codes', () => {
    expect(ADM4_PATTERN.test('31.71.01.1001')).toBe(true)
    expect(ADM4_PATTERN.test('3171011001')).toBe(false)
    expect(ADM4_PATTERN.test('99.99.99.9999')).toBe(true)
  })

  it('converts a picked entry into a saved location', () => {
    expect(toSavedLocation(entries[0])).toMatchObject({
      adm4: '63.71.01.1001',
      label: 'Kota Banjarmasin',
      provinsi: 'Kalimantan Selatan'
    })
  })
})

describe('cache freshness', () => {
  const now = new Date('2026-11-04T09:00:00.000Z')
  it('expires cached forecasts after the TTL', () => {
    expect(isCacheFresh('2026-11-04T08:50:00.000Z', now)).toBe(true)
    expect(isCacheFresh('2026-11-04T08:00:00.000Z', now)).toBe(false)
    expect(isCacheFresh('not a date', now)).toBe(false)
  })
})
