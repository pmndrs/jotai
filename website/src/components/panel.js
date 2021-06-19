import React from 'react'

export const Panel = ({ headline = null, body = null, demo = null }) => {
  return (
    <section className="space-y-2">
      {headline && (
        <h2 className="font-bold text-3xl text-gray-300">{headline}</h2>
      )}
      {body && (
        <div className="lg:text-lg text-gray-600 leading-normal">{body}</div>
      )}
      {demo}
    </section>
  )
}
