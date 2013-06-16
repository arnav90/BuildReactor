define([
	'services/request',
	'rx',
	'jquery'
], function (request, Rx, $) {

	'use strict';

	var successResponse = { data: {}, textStatus: 'success' };

	describe('services/request', function () {

		describe('json', function () {

			it('should set ajax options', function () {
				var settings = {
					url: 'http://sample.com',
					data: { param: 'value' }
				};
				spyOn($, 'ajaxAsObservable').andCallFake(function (options) {
					expect(options.dataType).toBe('json');
					expect(options.url).toBe('http://sample.com');
					expect(options.type).toBe('GET');
					expect(options.cache).toBe(false);
					expect(options.data).toBe(settings.data);
					return Rx.Observable.returnValue(successResponse);
				});

				request.json(settings).subscribe();

				expect($.ajaxAsObservable).toHaveBeenCalled();
			});

			it('should set basic authentication', function () {
				spyOn($, 'ajaxAsObservable').andCallFake(function (options) {
					expect(options.headers.Authorization).toBe('Basic dXNlcm5hbWUxOnBhc3N3b3JkMTIz');
					return Rx.Observable.returnValue(successResponse);
				});
				var settings = {
					url: 'http://example.com',
					username: 'username1',
					password: 'password123'
				};

				request.json(settings).subscribe();

				expect($.ajaxAsObservable).toHaveBeenCalled();
			});

			it('should call custom parser if specified', function () {
				var parser = jasmine.createSpy();
				spyOn($, 'ajaxAsObservable').andReturn(Rx.Observable.returnValue(successResponse));
				var settings = {
					url: 'http://example.com',
					parser: parser
				};

				request.json(settings).subscribe();

				expect(parser).toHaveBeenCalledWith(successResponse.data);
			});

			it('should return json response', function () {
				var response = { data: "some data", textStatus: 'success' };
				var actualResponse;
				spyOn($, 'ajaxAsObservable').andReturn(Rx.Observable.returnValue(response));

				request.json({ url: 'http://sample.com'}).subscribe(function (d) {
					actualResponse = d;
				});

				expect(actualResponse).toBe(response.data);
			});

			describe('errors', function () {

				it('should throw exception on unknown connection error', function () {
					var response = {
						textStatus: 'error',
						jqXHR: { status: 0 }
					};
					var actualResponse;
					var ajaxOptions = {
						url: 'http://sample.com/',
						data: {
							param1: 'value1',
							'param_2': 'value2'
						}
					};
					spyOn($, 'ajaxAsObservable').andReturn(Rx.Observable.throwException(response));

					request.json(ajaxOptions).subscribe(function (d) {}, function (d) {
						actualResponse = d;
					});

					expect(actualResponse.name).toBe('AjaxError');
					expect(actualResponse.message).toBe('Ajax connection error');
					expect(actualResponse.description).not.toBeDefined();
					expect(actualResponse.details.url).toBe('http://sample.com/?param1=value1&param_2=value2');
					expect(actualResponse.details.ajaxOptions).toBeDefined();
				});

				it('should throw exception on connection error with message', function () {
					var response = {
						errorThrown: 'Not found',
						textStatus: 'error',
						jqXHR: { status: 404 }
					};
					var actualResponse;
					var ajaxOptions = { url: 'http://sample.com' };
					spyOn($, 'ajaxAsObservable').andReturn(Rx.Observable.throwException(response));

					request.json(ajaxOptions).subscribe(function (d) {}, function (d) {
						actualResponse = d;
					});

					expect(actualResponse.message).toBe('Not found');
					expect(actualResponse.description).toBe('Not found (404)');
					expect(actualResponse.details.httpStatus).toBe(404);
				});

				it('should remove session cookie if 401 received', function () {
					var response = {
						textStatus: 'error',
						jqXHR: { status: 401 }
					};
					var ajaxOptions = {
						url: 'http://sample.com',
						authCookie: 'JSESSIONID'
					};
					spyOn($, 'ajaxAsObservable').andCallFake(function (options) {
						return Rx.Observable.throwException(response);
					});
					spyOn(chrome.cookies, 'remove').andCallFake(function (url, authCookie) {
						expect(url).toBe(ajaxOptions.url);
						expect(authCookie).toBe(ajaxOptions.authCookie);
					});

					request.json(ajaxOptions).subscribe(function (d) {}, function (d) {});

					expect(chrome.cookies.remove).toHaveBeenCalled();
				});

				it('should retry once if 401 received', function () {
					var response = {
						textStatus: 'error',
						jqXHR: { status: 401 }
					};
					var ajaxOptions = {
						url: 'http://sample.com',
						authCookie: 'JSESSIONID'
					};
					spyOn($, 'ajaxAsObservable').andCallFake(function (options) {
						return Rx.Observable.throwException(response);
					});
					spyOn(chrome.cookies, 'remove');

					request.json(ajaxOptions).subscribe(function (d) {}, function (d) {});

					expect(chrome.cookies.remove.callCount).toBe(2);
				});

				it('should throw exception on jQuery parse error', function () {
					var response = {
						textStatus: 'parsererror',
						jqXHR: {
							status: 200,
							responseText: '<html />'
						},
						errorThrown: {
							message: 'Unexpected token <'
						}
					};
					var actualResponse;
					var ajaxOptions = { url: 'http://sample.com' };
					spyOn($, 'ajaxAsObservable').andReturn(Rx.Observable.throwException(response));

					request.json(ajaxOptions).subscribe(function (d) {}, function (d) {
						actualResponse = d;
					});

					expect(actualResponse.name).toBe('ParseError');
					expect(actualResponse.message).toBe('Unexpected token <');
					expect(actualResponse.description).not.toBeDefined();
					expect(actualResponse.details.httpStatus).toBe(200);
					expect(actualResponse.details.url).toBe('http://sample.com');
					expect(actualResponse.details.ajaxOptions).toBeDefined();
				});

				it('should throw exception on custom parse error', function () {
					var parser = function (response) {
						return response.unknown.unknown;
					};
					spyOn($, 'ajaxAsObservable').andReturn(Rx.Observable.returnValue(successResponse));
					var settings = {
						url: 'http://example.com',
						parser: parser
					};

					var errorResponse;
					var a = request.json(settings);
					a.subscribe(function (d) {}, function (ex) {
						errorResponse = ex;
					});

					expect(errorResponse.name).toBe('ParseError');
					expect(errorResponse.message).toBe('Unrecognized response');
					expect(errorResponse.httpResponse).toBe(successResponse);
				});

			});
		});

		describe('xml', function () {

			it('should set ajax options', function () {
				var settings = {
					url: 'http://sample.com',
					data: { param: 'value' }
				};
				spyOn($, 'ajaxAsObservable').andCallFake(function (options) {
					expect(options.dataType).toBe('xml');
					expect(options.url).toBe('http://sample.com');
					expect(options.type).toBe('GET');
					expect(options.cache).toBe(false);
					expect(options.data).toBe(settings.data);
					return Rx.Observable.returnValue(successResponse);
				});

				request.xml(settings).subscribe();

				expect($.ajaxAsObservable).toHaveBeenCalled();
			});

		});
	});

});