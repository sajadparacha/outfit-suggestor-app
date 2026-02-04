# Local database schema

- **Source:** `sajad@localhost:5432/outfit_suggestor`

## Local schema (tables and columns)

### access_logs
- **id** integer NOT NULL DEFAULT nextval('access_logs_id_seq'::regclass)
- **ip_address** character varying NOT NULL
- **user_agent** text NULL
- **endpoint** character varying NOT NULL
- **method** character varying NOT NULL
- **country** character varying NULL
- **country_code** character varying NULL
- **city** character varying NULL
- **region** character varying NULL
- **latitude** character varying NULL
- **longitude** character varying NULL
- **user_id** integer NULL
- **age_group** character varying NULL
- **status_code** integer NOT NULL
- **response_time_ms** integer NULL
- **timestamp** timestamp without time zone NOT NULL
- **referer** text NULL
- **request_size** integer NULL
- **response_size** integer NULL
- **operation_type** character varying NULL

### outfit_history
- **id** integer NOT NULL DEFAULT nextval('outfit_history_id_seq'::regclass)
- **created_at** timestamp without time zone NOT NULL
- **text_input** text NULL
- **shirt** character varying NOT NULL
- **trouser** character varying NOT NULL
- **blazer** character varying NOT NULL
- **shoes** character varying NOT NULL
- **belt** character varying NOT NULL
- **reasoning** text NOT NULL
- **image_data** text NULL
- **user_id** integer NULL
- **model_image** text NULL

### users
- **id** integer NOT NULL DEFAULT nextval('users_id_seq'::regclass)
- **email** character varying NOT NULL
- **hashed_password** character varying NOT NULL
- **full_name** character varying NULL
- **is_active** boolean NOT NULL
- **created_at** timestamp without time zone NOT NULL
- **updated_at** timestamp without time zone NOT NULL
- **email_verified** boolean NOT NULL DEFAULT false
- **activation_token** character varying NULL
- **activation_token_expires** timestamp without time zone NULL
- **is_admin** boolean NOT NULL DEFAULT false

### wardrobe_items
- **id** integer NOT NULL DEFAULT nextval('wardrobe_items_id_seq'::regclass)
- **user_id** integer NOT NULL
- **category** character varying NOT NULL
- **name** character varying NULL
- **description** text NULL
- **color** character varying NULL
- **brand** character varying NULL
- **size** character varying NULL
- **image_data** text NULL
- **tags** text NULL
- **condition** character varying NULL
- **purchase_date** timestamp without time zone NULL
- **last_worn** timestamp without time zone NULL
- **wear_count** integer NOT NULL
- **created_at** timestamp without time zone NOT NULL
- **updated_at** timestamp without time zone NOT NULL

## Foreign keys (local)

- outfit_history.user_id -> users.id
- wardrobe_items.user_id -> users.id
