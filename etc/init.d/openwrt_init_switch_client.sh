#!/bin/sh /etc/rc.common
#
# OpenWRT init script для switch client сервиса
# Установить: скопировать в /etc/init.d/switch_client
# Включить: /etc/init.d/switch_client enable
# Запустить: /etc/init.d/switch_client start
#



START=99
STOP=15

USE_PROCD=1
PROG=/usr/sbin/openwrt_switch_client

start_service() {
        PID=$(pgrep -f ${PROG})
        if [ -z "$PID" ]  ; then
             
                procd_open_instance
                procd_set_param command /bin/sh "$PROG"
                procd_set_param stdout 1
                procd_set_param stderr 1
                procd_close_instance
        fi
}

stop_service() {
        pids=$(pgrep -f ${PROG} | xargs echo)
        for i in $pids; do extra_pids="${extra_pids} $(pgrep -P $i | xargs echo)"; done;
        kill $(echo "${extra_pids} ${pids}") 2> /dev/null
}