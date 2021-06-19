import React from 'react'

import { Button } from '../components'

export const Navigation = (props) => {
  return (
    <nav {...props}>
      <Button to="https://docs.pmnd.rs/jotai" icon="book" external>
        Documentation
      </Button>
      <Button to="https://github.com/pmndrs/jotai" icon="github" external>
        Repository
      </Button>
      <Button to="https://www.npmjs.com/package/jotai" icon="npm" external>
        Package
      </Button>
      <Button
        to="https://egghead.io/courses/manage-application-state-with-jotai-atoms-2c3a29f0"
        icon="cap"
        external>
        Course
      </Button>
      <Button to="https://twitter.com/dai_shi" icon="twitter" external>
        Updates
      </Button>
    </nav>
  )
}
