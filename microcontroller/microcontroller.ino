int x = 0;
void setup() {
  // put your setup code here, to run once:
  Serial.begin(9600);
}

void loop() {
  // put your main code here, to run repeatedly:
  Serial.print(x);
  Serial.print(x - 1);
  Serial.print(x - 2);
  Serial.print("-");
  delay(1000);
  x++;
}
