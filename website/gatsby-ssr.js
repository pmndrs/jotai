export { wrapRootElement, wrapPageElement } from './gatsby-shared.js'

export const onRenderBody = ({ setHtmlAttributes, setPreBodyComponents }) => {
  setHtmlAttributes({ lang: 'en' })
  setPreBodyComponents([
    <script
      key="dark-mode"
      dangerouslySetInnerHTML={{
        __html: `(function() {
  var storageKey = 'darkMode';
  var classNameDark = 'dark';
  var classNameLight = 'light';
  function setClassOnDocumentBody(darkMode) {
    document.body.classList.add(darkMode ? classNameDark : classNameLight);
    document.body.classList.remove(darkMode ? classNameLight : classNameDark);
  }
  var localStorageTheme = null;
  try {
    localStorageTheme = localStorage.getItem(storageKey);
  } catch (err) {}
  var localStorageExists = localStorageTheme !== null;
  if (localStorageExists) {
    localStorageTheme = JSON.parse(localStorageTheme);
  }
  if (localStorageExists) {
    setClassOnDocumentBody(localStorageTheme);
  } else {
    var isDarkMode = document.body.classList.contains(classNameDark);
    localStorage.setItem(storageKey, JSON.stringify(isDarkMode));
  }
})();`,
      }}
    />,
  ])
}
