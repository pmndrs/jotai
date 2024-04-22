/* const fs = require('fs')
const path = require('path')

function processDirectory(directory) {
  const files = fs.readdirSync(directory)

  files.forEach((file) => {
    const filePath = path.join(directory, file)
    const stats = fs.statSync(filePath)

    if (stats.isDirectory()) {
      // 如果是目录，递归处理
      processDirectory(filePath)
    } else if (path.extname(file) === '.md' || path.extname(file) === '.mdx') {
      // 只处理 .md 或 .mdx 文件
      const data = fs.readFileSync(filePath, 'utf8')

      const updatedData = data.replace(
        /^(#{1,6}) (.*?)( \{#.*?\})?$/gm,
        (match, p1, p2, p3) => {
          // 如果标题已经包含自定义锚点，不作任何操作
          if (p3) return match

          const id = p2.toLowerCase().replace(/\s+/g, '-')
          return `${p1} ${p2} {#${id}}`
        },
      )

      // 将更新后的数据写回文件
      fs.writeFileSync(`./docs-test/${filePath}`, updatedData)
    }
  })
}

// 开始处理 './docs' 目录
processDirectory('./docs') */

// const fs = require('fs');
// const path = require('path');

// // 读取目录中的所有文件
// const files = fs.readdirSync('./docs/basics');
// console.log('files', files);

// files.forEach(file => {
//   // 只处理 .md 或 .mdx 文件
//   if (path.extname(file) === '.md' || path.extname(file) === '.mdx') {
//     const data = fs.readFileSync(`./docs/basics/${file}`, 'utf8');

//     const updatedData = data.replace(
//       /^(#{1,6}) (.*?)( \{#.*?\})?$/gm,
//       (match, p1, p2, p3) => {
//         // 如果标题已经包含自定义锚点，不作任何操作
//         if (p3) return match;

//         const id = p2.toLowerCase().replace(/\s+/g, '-');
//         return `${p1} ${p2} {#${id}}`;
//       },
//     );

//     // 将更新后的数据写回文件
//     fs.writeFileSync(`./docs-test/${file}`, updatedData);
//   }
// });

const fs = require('fs')
// const path = require('path')
const { globSync } = require('glob')

// // 使用 glob 匹配所有的 .md 和 .mdx 文件
// const files = globSync('./docs/**/*.{md,mdx}')
// console.log('files', files);

// files.forEach((file) => {
//   const data = fs.readFileSync(file, 'utf8')

//   const updatedData = data.replace(
//     /^(#{1,6}) (.*?)( \{#.*?\})?$/gm,
//     (match, p1, p2, p3) => {
//       // 如果标题已经包含自定义锚点，不作任何操作
//       if (p3) return match

//       const id = p2.toLowerCase().replace(/\s+/g, '-')
//       return `${p1} ${p2} {#${id}}`
//     },
//   )

//   // 将更新后的数据写入 ./docs-test 目录
//   const outputFilePath = path.join('./docs-test', path.relative('./docs', file))
//   fs.mkdirSync(path.dirname(outputFilePath), { recursive: true })
//   fs.writeFileSync(outputFilePath, updatedData)
// })

// 使用 glob 匹配所有的 .md 和 .mdx 文件
const files = globSync('./docs/**/*.{md,mdx}')

files.forEach((file) => {
  const data = fs.readFileSync(file, 'utf8')

  const updatedData = data.replace(
    /^(#{1,6}) (.*?)( \{#.*?\})?$/gm,
    (match, p1, p2, p3) => {
      // 如果标题已经包含自定义锚点，不作任何操作
      if (p3) return match

      const id = p2.toLowerCase().replace(/\s+/g, '-')
      return `${p1} ${p2} {#${id}}`
    },
  )

  // 将更新后的数据写回文件
  fs.writeFileSync(file, updatedData)
})
