import retry from 'retry'

export async function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<string> {
  return new Promise<string>((resolver, rejector) => {
    const operation = retry.operation({ maxTimeout: 30000 })

    operation.attempt(async () => {
      try {
        const response = await fetch(input, init)
        if (!response.ok) {
          throw new Error(`Failed to connect to ${response.url} with error ${response.status}: ${await response.text()}`)
        } else {
          resolver(await response.text())
        }
      } catch (err) {
        if (!operation.retry(err as Error)) {
          rejector(operation.mainError())
        } else {
          console.error(`${(err as Error).message}. Retrying...`)
        }
      }
    })
  })
}