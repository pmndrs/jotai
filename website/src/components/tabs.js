import { useMemo } from 'react';
import { Tab } from '@headlessui/react';
import cx from 'classnames';

export const Tabs = ({ orientation = 'horizontal', tabs = {} }) => {
  const vertical = orientation === 'vertical';
  const tabLabels = useMemo(() => Object.keys(tabs), [tabs]);
  const tabContents = useMemo(() => Object.values(tabs), [tabs]);

  return (
    <>
      <div className="flex flex-col gap-4 lg:hidden">
        {tabContents.map((content, index) => (
          <div key={index}>
            {!vertical && <h2>{tabLabels[index]}</h2>}
            {content}
          </div>
        ))}
      </div>
      <Tab.Group
        as="div"
        vertical={vertical}
        className={cx('tabs relative hidden w-full lg:flex', !vertical && 'flex-col')}
      >
        <div className={cx('relative mb-4 flex-shrink-0', vertical && 'w-1/4 pr-4 ')}>
          <Tab.List
            as="div"
            className={cx(
              'flex w-full',
              !vertical ? 'flex-row gap-6' : 'sticky top-8 flex-col gap-3',
            )}
          >
            {tabLabels.map((label) => (
              <Tab key={label}>
                {({ selected }) => (
                  <div
                    className={cx(
                      'rounded-lg border px-3 py-1.5 text-left font-bold leading-tight transition duration-300 ease-in-out hover:border-blue-200 hover:bg-blue-100 hover:text-black dark:hover:bg-white dark:!border-none dark:hover:text-black',
                      !selected
                        ? 'border-transparent text-gray-350 dark:text-gray-300'
                        : ' border-blue-200 bg-blue-100 text-black dark:border-gray-700 dark:bg-white dark:text-black dark:hover:text-black',
                      !vertical ? 'text-2xl lg:text-3xl' : 'text-lg',
                    )}
                  >
                    {label}
                  </div>
                )}
              </Tab>
            ))}
          </Tab.List>
        </div>
        <Tab.Panels className={cx('flex-shrink-0', !vertical ? 'w-full' : 'w-3/4 pl-4')}>
          {tabContents.map((content, index) => (
            <Tab.Panel key={index}>{content}</Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </>
  );
};
