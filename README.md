# enb-transform-flow

Позволяет преобразовать исходный код с помощью произвольного набора преобразователей

## Установка

``` npm i enb-ttransform-flow ```

## Использование 

**Опции**

* *String* **target** - Результирующий таргет. По умолчанию - ?.transform
* *String* **sourceSuffixes** - Набор расширений файлов для перобразования.
* *Function[] | Function* **transformators** - Набор преобразователей исходного кода - функции, которые принимают код и возвращают результат трансформации или промис.

**Пример**

```javascript
[ require('enb-transform-flow/techs/tarnsform-flow'), {
    sourceSuffixes: ['js'],
    target: '_?.js',
    transformators: [
      function (source) { return require('babel').transform(source).code; },
      function (source) { return require('uglify-js').minify(source).code; }
    ]
} ]
```

 **Пример с очередями**
 Можно использовать очередь для выполнения задач в параллельных подпроцессах. Подходит для выполнения тяжелых синхронных трансформаций.

 ```javascript
[ require('enb-transform-flow/techs/tarnsform-flow'), {
    sourceSuffixes: ['js'],
    target: '_?.js',
    transformators: [
        function (code, queue) {
            var compilerFilename = require('path').resolve(__dirname, './worker-tasks/babel-transformator');
            return queue.push(compilerFilename, code, { 
                externalHelpers: 'var',
                ast: false,
                blacklist: ['useStrict']
            }).then(function (compiledObj) {
                return compiledObj.code;
            });
        },
        function (code, queue) {
            var compilerFilename = require('path').resolve(__dirname, './worker-tasks/uglifyjs-minifier');
            return queue.push(compilerFilename, code, {
                fromString: true
            }).then(function (compiledObj) {
                return compiledObj.code;
            });
        }
    ]
} ]
```
