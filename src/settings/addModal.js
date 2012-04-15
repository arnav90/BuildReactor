﻿define([
		'signals',
		'jquery',
		'jqueryTools'
], function (signals, $) {

	var serviceAdded = new signals.Signal();
	var scrollableApi;

	function initialize() {
		scrollableApi = undefined;
		$('#service-add-wizard .thumbnails a').click(serviceAddSelect);
		$('#service-add-form').submit(function () {
			serviceAdd();
			return false;
		});
	}

	function show() {
		if (scrollableApi == undefined) {
			initializeModal();
		}
		scrollableApi.begin(0);
		$('#service-add-wizard .btn-primary').addClass('disabled');
		$('#service-add-name').val('');
		$('#service-add-wizard').modal();
	}

	function hide() {
		$('#service-add-wizard').modal('hide');
	}

	function getName() {
		return $('#service-add-name').val();
	}

	function initializeModal() {
		initializeScrollable();
		$('#service-add-wizard .btn-primary').click(serviceAdd);
		$('#service-add-name').on('input', function () {
			if ($(this).val() == '') {
				$('#service-add-wizard .btn-primary').addClass('disabled');
			} else {
				$('#service-add-wizard .btn-primary').removeClass('disabled');
			}
		});

		function initializeScrollable() {
			var scrollable = $('.scrollable').scrollable().data('scrollable');
			scrollable.onBeforeSeek(function (event, index) {
				if (scrollable.getIndex() != index) {
					$('#service-add-wizard .steps li.active').removeClass('active');
					$('#service-add-wizard .steps li').eq(index).addClass('active');
				}
			});
			scrollable.onSeek(function (event, index) {
				if (index == 1) {
					$('#service-add-name').focus();
				}
			});
			scrollableApi = scrollable;
		}
	}

	function serviceAddSelect(sender) {
		scrollableApi.next();
	}

	function serviceAdd() {
		if ($('#service-add-wizard .btn-primary').hasClass('disabled')) {
			return;
		}
		hide();
		serviceAdded.dispatch({
			name: getName(),
			baseUrl: 'src/bamboo',
			service: 'bambooBuildService',
			settingsController: 'bambooSettingsController',
			settingsPage: 'bambooOptions.html',
			updateInterval: 60,
			plans: []
		});
	}

	return {
		initialize: initialize,
		show: show,
		serviceAdded: serviceAdded
	};
});