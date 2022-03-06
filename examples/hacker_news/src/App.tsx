import { Suspense } from 'react'
import { a, useSpring } from '@react-spring/web'
import Parser from 'html-react-parser'
import { Provider, atom, useAtom, useSetAtom } from 'jotai'
import { atomWithQuery } from 'jotai/query'

// type PostData = {
//   by: string
//   descendants?: number
//   id: number
//   kids?: number[]
//   parent: number
//   score?: number
//   text?: string
//   time: number
//   title?: string
//   type: 'comment' | 'story'
//   url?: string
// }

const postId = atom(9001)

const postData = atomWithQuery((get) => ({
  queryKey: ['news', get(postId)],
  queryFn: async ({ queryKey: [, id] }) => {
    const res = await fetch(
      `https://hacker-news.firebaseio.com/v0/item/${id}.json`
    )
    return res.json()
  },
}))

function Id() {
  const [id] = useAtom(postId)
  const props = useSpring({ from: { id }, id, reset: true })
  return <a.h1>{props.id.to(Math.round)}</a.h1>
}

function Next() {
  // Use `useSetAtom` to avoid re-render
  // const [, set] = useAtom(postId)
  const setPostId = useSetAtom(postId)
  return (
    <button onClick={() => setPostId((id) => id + 1)}>
      <div>→</div>
    </button>
  )
}

function PostTitle() {
  const [{ by, text, time, title, url }] = useAtom(postData)
  return (
    <>
      <h2>{by}</h2>
      <h6>{new Date(time * 1000).toLocaleDateString('en-US')}</h6>
      {title && <h4>{title}</h4>}
      {url && <a href={url}>{url}</a>}
      {text && <div>{Parser(text)}</div>}
    </>
  )
}

export default function App() {
  return (
    <Provider>
      <Id />
      <div>
        <Suspense fallback={<h2>Loading...</h2>}>
          <PostTitle />
        </Suspense>
      </div>
      <Next />
    </Provider>
  )
}
