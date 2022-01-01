import { Button } from '../components'

export const Credits = () => {
  return (
    <>
      <Button
        to="https://jessiewaters.com"
        title="Jessie Waters"
        className="inline-flex justify-center items-center"
        style={{ width: 172 }}
        dark
        small
        external>
        mascot by Jessie Waters
      </Button>
      <Button
        to="https://candycode.com/"
        title="candycode, an alternative graphic design and web development agency based in San Diego"
        className="inline-flex justify-center items-center"
        style={{ width: 172, height: 28 }}
        dark
        small
        external>
        <div className="inline-flex items-center space-x-1">
          <span>website by</span>
          <img
            src="https://storage.googleapis.com/candycode/candycode.png"
            alt="candycode alternative graphic design web development agency San Diego"
            style={{ height: 15 }}
          />
        </div>
      </Button>
    </>
  )
}
