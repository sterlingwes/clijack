#!/bin/bash

mkdir -p dist/examples/scenarios/base-interactive
cp examples/scenarios/base-interactive/cli.sh dist/examples/scenarios/base-interactive/
chmod +x dist/examples/scenarios/base-interactive/cli.sh

mkdir -p dist/examples/scenarios/spawn-error
cp examples/scenarios/spawn-error/cli.sh dist/examples/scenarios/spawn-error/
chmod +x dist/examples/scenarios/spawn-error/cli.sh