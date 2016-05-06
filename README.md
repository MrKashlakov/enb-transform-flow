# enb-transform-flow #

Позволяет преобразовать исходный код с помощью произвольного набора преобразователей

## Установка ##

``` npm i enb-ttransform-flow ```

## Использованеи ## 

**Опции**

* *String* **target** - Результирующий таргет. По умолчанию - ?.transform
* *String* **source** - Исходный таргет. Обязательная опция.
* *Function[]* **tranformators** - Набор преобразователей исходного кода

**Пример**

```javascript
[ require('enb-transform-flow/techs/tarnsform-flow'), {
		source: '?.js',
		target: '_?.js',
		transformators: [
			function (source) { return require('babel').transform(source).code; },
			function (source) { return require('uglify-js').minify(source).code; }
		]
} ]
```