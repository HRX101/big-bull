from twilio.rest import Client

account_sid = 'ACee3fa2e7fbf7e479f135eaea8e3b8ee9'
auth_token = '[AuthToken]'
client = Client(account_sid, auth_token)

message = client.messages.create(
from_='whatsapp:+14155238886',
content_sid='HXb5b62575e6e4ff6129ad7c8efe1f983e',
content_variables='{"1":"12/1","2":"3pm"}',
to='whatsapp:+916296821825'
)

print(message.sid)
----------

from twilio.rest import Client

account_sid = 'ACee3fa2e7fbf7e479f135eaea8e3b8ee9'
auth_token = '[AuthToken]'
client = Client(account_sid, auth_token)

message = client.messages.create(
from_='whatsapp:+14155238886',
body='Your appointment is coming up on July 21 at 3PM',
to='whatsapp:+916296821825'
)

print(message.sid)
