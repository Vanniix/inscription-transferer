import fs from 'fs'
import { parse } from 'csv-parse'

export async function loadCsv(csvFile: string) {
  const csv = await new Promise<{ address: string, id: string }[]>((resolver, rejector) => {
    const data: { address: string, id: string }[] = []
    fs.createReadStream(csvFile)
      .pipe(parse({ columns: true }))
      .on("data", function (row) {
        for (const [key, value] of Object.entries(row)) {
          row[key] = typeof value === 'string' && value.length > 0 ? value : undefined
        }
        
        if (row.id != null && row.address != null) {
          data.push(row)
        }
      })
      .on("error", function (error) {
        rejector(error)
      })
      .on("end", function () {
        resolver(data)
      })
  })
  
  return csv
}