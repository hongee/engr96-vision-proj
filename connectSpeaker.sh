#!/bin/sh
rfkill unblock bluetooth
sleep 1
bluetoothctl << EOF
connect 00:1F:81:99:40:1F
EOF
pactl set-default-sink bluez_sink.00_1F_81_99_40_1F
sleep 1
