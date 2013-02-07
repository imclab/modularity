REPORTER?=progress
ifdef V
	REPORTER=spec
endif

test:
	@DISABLE_LOGGING=1 ./node_modules/mocha/bin/mocha \
		--reporter $(REPORTER) test

check: test

.PHONY: test
