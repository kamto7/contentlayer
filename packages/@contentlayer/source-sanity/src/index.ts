import { SourcePlugin } from '@contentlayer/core'
import type { MutationEvent } from '@sanity/client'
import { defer, from, Observable, of } from 'rxjs'
import { mergeMap, startWith } from 'rxjs/operators'
import { fetchData } from './fetchData'
import { provideSchema } from './provideSchema'
import { getSanityClient } from './sanity-client'

type MakeSourcePlugin = (_: { studioDirPath: string; preview?: boolean }) => SourcePlugin

export const makeSourcePlugin: MakeSourcePlugin = ({ studioDirPath }) => ({
  provideSchema: () => provideSchema(studioDirPath),
  fetchData: ({ watch, force, previousCache }) => {
    const updates$ = watch ? getUpdateEvents(studioDirPath).pipe(startWith(0)) : of(0)
    const data$ = from(provideSchema(studioDirPath)).pipe(
      mergeMap((schemaDef) => fetchData({ schemaDef, force, previousCache, studioDirPath })),
    )

    return updates$.pipe(mergeMap(() => data$))
  },
  watchDataChange: () => getUpdateEvents(studioDirPath),
})

const getUpdateEvents = (studioDirPath: string): Observable<any> =>
  defer(() => getSanityClient(studioDirPath)).pipe(
    mergeMap((sanityClient) =>
      // `visibility: 'query'` needed otherwise event will trigger too early
      sanityClient.listen<MutationEvent>('*', {}, { events: ['mutation'], visibility: 'query' }),
    ),
  )
