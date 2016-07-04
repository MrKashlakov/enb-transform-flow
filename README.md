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
		target: '?.js',
		transformators: [
			function (params) {
			    var result = require('babel').transform(params.code);
			    return {
			        code: result.code; 
			        map: result.map
			    }
			},
			function (params) {
			    var result = require('uglify-js').minify(params.code);
			    return {
			        code: result.code; 
			        map: result.map
			    }
			}
		]
} ]
```


```javascript
[ require('enb-transform-flow/techs/tarnsform-flow'), {
     sourceSuffixes: ['js'],
     target: '_?.js',
     transformators: [
     
        /**
          * Функция-трансформатор, запускающая обработку бабелем полученного кода
          *
          * @param {Object} params Параметры трансформатора
          * @param {String} params.code Код, который нужно преобразовать
          * @param {Object} params.queue Очередь для выполнения тасок в параллельных подпроцессах
          * @param {Object} params.map sourcemap с предыдущего преобразования
          * @param {Object} params.filename Имя файла
          * @returns {Promise}
          */
         function (params) {
            var code = params.code;
            var queue = params.queue;

            var compilerFilename = require('path').resolve(__dirname, './worker-tasks/babel-transformator');
            return queue.push(compilerFilename, code, { 
                externalHelpers: 'var',
                ast: false,
                blacklist: ['useStrict']
            }).then(function (compiledObj) {
                return compiledObj.code;
            });
         },
         
         /**
          * Функция-минификатор, запускающая минификацию uglifyjs'ом полученного кода
          *
          * @param {Object} params Параметры трансформатора
          * @param {String} params.code Код, который нужно преобразовать
          * @param {Object} params.queue Очередь для выполнения тасок в параллельных подпроцессах
          * @param {Object} params.map sourcemap с предыдущего преобразования
          * @param {Object} params.filename Имя файла
          * @returns {Promise}
          */
         function (params) {
            var code = params.code;
            var queue = params.queue;

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