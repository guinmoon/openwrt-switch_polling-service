# Switch Server

Простой HTTP сервер для управления выключателями с сохранением состояния в файл.

## Установка

```bash
npm install
```

## Настройка

1. Скопируйте `switches.json` и отредактируйте настройки:
   - `port` - порт для слушания
   - `host` - адрес для привязки
   - `secretKey` - секретный ключ для авторизации
   - `switches` - массив выключателей с полями:
     - `id` - уникальный идентификатор
     - `name` - имя выключателя
     - `state` - текущее состояние (true/false)
     - `action` - команда/скрипт для выполнения при включении

## Запуск

```bash
node server.js
```

## API

Все запросы требуют передачу секретного ключа. Для GET запросов ключ передается как query параметр `key`, для POST — в теле запроса.

### GET /switches?key=<secretKey>
Получить список всех выключателей

```bash
curl "http://localhost:3000/switches?key=my-secret-key-12345"
```

### GET /switch/:id?key=<secretKey>
Получить состояние конкретного выключателя

```bash
curl "http://localhost:3000/switch/switch1?key=my-secret-key-12345"
```

### POST /switch
Переключить состояние выключателя (toggle)

```bash
curl -X POST http://localhost:3000/switch \
  -H "Content-Type: application/json" \
  -d '{"key": "my-secret-key-12345", "id": "switch1"}'
```

### POST /switch/:id/set
Установить конкретное состояние выключателя

```bash
# Включить
curl -X POST http://localhost:3000/switch/switch1/set \
  -H "Content-Type: application/json" \
  -d '{"key": "my-secret-key-12345", "on": true}'

# Выключить
curl -X POST http://localhost:3000/switch/switch1/set \
  -H "Content-Type: application/json" \
  -d '{"key": "my-secret-key-12345", "on": false}'
```

### GET /log?key=<secretKey>&limit=N
Получить последние N записей лога

```bash
curl "http://localhost:3000/log?key=my-secret-key-12345&limit=20"
```

## OpenWRT клиент

Скрипт `openwrt_switch_client.sh` предназначен для установки на OpenWRT роутер.

### Установка

1. Скопируйте скрипт на роутер:
```bash
scp openwrt_switch_client.sh root@192.168.1.1:/usr/bin/
```

2. Сделайте исполняемым:
```bash
chmod +x /usr/bin/openwrt_switch_client.sh
```

3. Отредактируйте настройки в начале скрипта:
   - `SERVER_URL` - URL вашего сервера
   - `SECRET_KEY` - секретный ключ из switches.json
   - `INTERVAL` - интервал проверки в секундах

4. Запустите как сервис:
```bash
# Добавить в cron для автоматического запуска
echo "*/1 * * * * /usr/bin/openwrt_switch_client.sh 30" >> /etc/crontabs/root
/etc/init.d/cron restart
```

Или запустите вручную:
```bash
/usr/bin/openwrt_switch_client.sh 30  # Проверка каждые 30 секунд
```

### Как это работает

1. Скрипт каждые K секунд делает GET запрос к серверу
2. Если есть включенные выключатели, выполняет их action
3. После выполнения action выключает выключатель на сервере
4. Все действия логируются через logger в OpenWRT

## Файлы

- `server.js` - основной файл сервера
- `switches.json` - конфигурация с выключателями
- `log.txt` - журнал обращений
- `openwrt_switch_client.sh` - клиент для OpenWRT
- `package.json` - npm конфигурация
