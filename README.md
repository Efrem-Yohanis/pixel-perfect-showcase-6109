# Safaricom Scheduler

The project is organized as three applications with a root Docker Compose stack:

```text
scheduler-ui/       TanStack Start and React UI (package.json dependencies)
scheduler-backend/  Django REST API and PostgreSQL schedule data (requirements.txt)
airflow-scheduler/  Apache Airflow image and SQL provider dependencies (requirements.txt)
docker-compose.yml  Local stack orchestration
.env.example        Environment variable template
```

The UI calls Django through `/api`. Django persists schedule configuration in the `safaricom` PostgreSQL database and creates/removes Airflow DAG files on the shared DAG volume. Airflow metadata is stored in a separate `airflow` database in the same PostgreSQL container.

## How scheduling works

1. The scheduler UI sends schedule configuration to the Django API.
2. Django stores it in the `safaricom` database and writes a generated DAG file to the shared Airflow DAG volume.
3. Airflow's DAG processor discovers the file. The Airflow scheduler calculates its next trigger time and queues due runs.
4. Airflow's `LocalExecutor` runs the task. Python tasks execute the supplied script; SQL tasks execute it using the selected Airflow connection.
5. The UI asks Django for schedule status, next/last run, run history, and logs. Django reads run metadata and task logs through Airflow's REST API.

Cron times use the timezone selected on the schedule. The displayed next-run time comes from Airflow's next trigger, not a UI estimate. Interval schedules run at the selected interval; manual schedules have no automatic next run and only execute when **Run Now** is pressed. Pausing a schedule stops future scheduled runs; resuming it lets Airflow calculate the next trigger again. Start and end dates bound the period when a schedule is eligible to run.

Cron schedules can also restrict runs to selected weekdays and an optional same-day time window. Weekday numbers use Monday=0 through Sunday=6. Selected weekdays further restrict the cron expression without changing its cadence. A time window requires both a start and end time, with the end later than the start; overnight windows are not supported. Triggers outside the window are skipped without changing the underlying cron frequency. Per-schedule excluded dates are also supported for Cron, Interval, and Manual schedules. All these checks use the schedule's configured timezone. The displayed next run is Airflow's next trigger and can still be skipped by a weekday, time-window, or excluded-date constraint.

## Create a new schedule

In the UI, open **New Schedule** from the schedules list. Complete the three steps and select **Create Schedule**:

### 1. Basic Info

- **Schedule name**: required and unique; it identifies the job in the schedule list and run history.
- **Owner name** and **Owner email**: required contact details.
- **Accept Notifications**: saves the notification preference with the schedule. **Email delivery is not currently implemented**, so enabling this setting does not send run emails yet.

### 2. Schedule

- Choose **Cron**, **Interval**, or **Manual**.
- For **Cron**, choose a daily, weekly, or monthly preset and set its time, or choose **Custom cron** and enter the five cron fields: minute, hour, day of month, month, weekday. For example, `35 13 * * *` runs daily at 13:35.
- For **Interval**, enter a positive number and choose minutes or hours.
- **Manual** runs only when **Run Now** is used.
- Select the timezone (the default is `Africa/Nairobi`), a start date, and an optional end date.
- For **Cron**, optionally select allowed weekdays and a same-day run window. Add excluded dates to skip particular calendar dates; excluded dates apply to Cron, Interval, and Manual triggers.

### 3. Task

- Choose **Python** or **SQL**.
- Type the script in the editor or upload a `.py`/`.sql` file (text files are also accepted).
- For **SQL**, select an existing Airflow connection. Configure that connection in Airflow before creating/running the job; the connection ID must match the one selected in the form.
- **Advanced** settings optionally control retry count and retry delay in seconds.

The form requires a non-empty script, a valid owner email, and an SQL connection for SQL tasks. After creation, the new schedule appears in the schedules list. Open it to see its configuration, run history, and logs; use **Run Now** to start an immediate run independently of its regular schedule.

Python scripts execute in Airflow. If a script defines a callable named `main`, the scheduler calls `main()` after loading the script; otherwise, the script's top-level code runs. Use trusted scripts only.

## Start the stack

1. Copy `.env.example` to `.env`.
2. Replace every example password/key with a unique secret. Hex-only secrets avoid URL encoding issues in the PostgreSQL connection strings.
3. Start all services from the repository root:

   ```sh
   docker compose up --build
   ```

4. Open:
   - UI: <http://localhost:5173>
   - Airflow: <http://localhost:8080>
   - Django API health check: <http://localhost:8000/api/health/>

Create Airflow connections for SQL jobs in the Airflow UI, using the connection IDs shown in the scheduler UI.

The UI image uses `npm ci` and the checked-in lockfile. If the build reports `ENOTFOUND registry.safaricomet.net`, Docker and the host need access to the corporate network/DNS that serves the configured npm registry. Use only an npm registry approved for your environment; do not disable TLS verification or switch registries to bypass network policy.

The local Compose stack binds services to loopback and is for development. Schedules can execute user-supplied Python and SQL in Airflow; only run trusted scripts. Add application authentication and task isolation before exposing this stack to a network.

## Run the UI by itself

```sh
cd scheduler-ui
npm install
npm run dev
```

For this mode, set `DJANGO_API_URL=http://127.0.0.1:8000` when starting Vite. The API and Airflow services must be running.
