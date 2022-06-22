import { Button } from '../components';

export const Credits = () => {
  return (
    <>
      <Button
        to="https://jessiewaters.com"
        title="Jessie Waters"
        className="inline-flex items-center justify-center"
        style={{ width: 175 }}
        dark
        small
        external
      >
        mascot by Jessie Waters
      </Button>
      <Button
        to="https://candycode.com/"
        title="candycode, an alternative graphic design and web development agency based in San Diego"
        className="inline-flex items-center justify-center"
        style={{ width: 175, height: 28 }}
        dark
        small
        external
      >
        <div className="inline-flex items-center space-x-1">
          <span className="whitespace-nowrap">website by</span>
          <img
            src="https://storage.googleapis.com/candycode/candycode.svg"
            alt="candycode alternative graphic design web development agency San Diego"
            style={{ position: 'relative', bottom: -0.5, height: 15 }}
          />
        </div>
      </Button>
    </>
  );
};
