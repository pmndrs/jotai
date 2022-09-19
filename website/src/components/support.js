import { useCallback, useState } from 'react';
import cx from 'classnames';
import { Button } from '../components';

export const Support = () => {
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [hasReceived, setHasReceived] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [honey, setHoney] = useState('');

  const handleSubmit = useCallback(async () => {
    if (honey !== '') return;
    if (hasReceived) return;

    setHasSubmitted(true);

    const data = {
      name,
      email,
      message,
    };

    const JSONdata = JSON.stringify(data);
    const endpoint = '/api/contact';
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSONdata,
    };

    const response = await fetch(endpoint, options);

    if (response.status === 200) {
      setHasReceived(true);
      setName('');
      setEmail('');
      setMessage('');
    }
  }, [name, email, message, hasReceived, honey]);

  return (
    <>
      <div className="flex">
        <div className="w-1/3 border-r border-gray-200 pr-8 dark:border-gray-800">
          <div className="text-2xl font-bold leading-tight text-gray-350 dark:text-gray-200 lg:text-3xl">
            Self-help
          </div>
          <div className="text-base">Check out these helpful resources.</div>
          <div className="mt-4 flex flex-col gap-4">
            <Button
              to="https://egghead.io/courses/manage-application-state-with-jotai-atoms-2c3a29f0"
              className="w-full"
              bold
              external
            >
              Manage Application State with Jotai Atoms
              <div className="absolute right-0 top-0 translate-x-1/2 -translate-y-1/2 overflow-hidden rounded bg-gray-800 px-1.5 pt-[4px] pb-[3px] text-xs font-semibold uppercase leading-none text-white dark:bg-gray-200 dark:text-black">
                Free
              </div>
            </Button>
            <Button
              to="https://daishi.gumroad.com/l/learn-jotai/website_qpiwdj8"
              className="w-full"
              bold
              external
            >
              Learn Simplified Jotai
            </Button>
            <Button
              to="https://daishi.gumroad.com/l/philosophy-of-jotai-1"
              className="w-full"
              bold
              external
            >
              Philosophy of Jotai: Part 1
            </Button>
          </div>
        </div>
        <div className="relative w-2/3 pl-8">
          <div>
            <div className="text-2xl font-bold leading-tight text-gray-350 dark:text-gray-200 lg:text-3xl">
              Professional support
            </div>
            <div className="text-base">
              Need more help? Request an expert code architecture review from Daishi Kato, the
              author of Jotai.
            </div>
            <div className="mt-4 flex flex-col gap-4">
              <label>
                <div>Name</div>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.currentTarget.value)}
                  className="form-input w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-lg focus-within:ring focus-within:ring-blue-400 dark:border-gray-800 dark:bg-gray-950 dark:focus-within:ring-teal-700"
                  required
                />
              </label>
              <label>
                <div>Email</div>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.currentTarget.value)}
                  className="form-input w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-lg focus-within:ring focus-within:ring-blue-400 dark:border-gray-800 dark:bg-gray-950 dark:focus-within:ring-teal-700"
                  required
                />
              </label>
              <label>
                <div>Message</div>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.currentTarget.value)}
                  rows={5}
                  className="form-input w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-lg focus-within:ring focus-within:ring-blue-400 dark:border-gray-800 dark:bg-gray-950 dark:focus-within:ring-teal-700"
                />
              </label>
              <label className="sr-only">
                <div>Don’t fill this out if you’re human:</div>
                <input
                  type="text"
                  value={honey}
                  onChange={(event) => setHoney(event.currentTarget.value)}
                />
              </label>
              <div className={cx(hasSubmitted && 'opacity-0')}>
                <Button icon="message" onClick={handleSubmit} dark bold>
                  Send inquiry
                </Button>
              </div>
            </div>
          </div>
          {hasSubmitted && (
            <div className="absolute inset-0 z-10 flex h-full w-full items-center justify-center bg-gray-100 text-3xl font-bold leading-tight text-gray-350 dark:bg-gray-900 dark:text-gray-200 lg:text-4xl">
              {hasReceived ? <span>Thanks!</span> : <span>Sending...</span>}
            </div>
          )}
        </div>
      </div>
      <div>
        <div className="mt-8 flex items-center gap-6">
          <a
            href="https://twitter.com/dai_shi"
            target="_blank"
            rel="noreferrer"
            className="flex-shrink-0"
          >
            <img
              src="https://storage.googleapis.com/candycode/jotai/daishi.png"
              className="aspect-square h-28 w-28 rounded-full border border-gray-300 bg-white dark:border-gray-800 dark:bg-black"
              alt="Daishi Kato"
            />
          </a>
          <div className="text-sm leading-tight">
            <span className="font-bold">Daishi Kato</span> is a software engineer who is passionate
            about open source software. He has been a researcher of peer-to-peer networks and web
            technologies for decades. His interest is in engineering, and he has been working with
            start-ups for the last 5 years. He has been actively involved in open source software
            since the 90s, and his latest work focuses on developing various libraries with
            JavaScript and React.
          </div>
        </div>
      </div>
    </>
  );
};
