# Voice Command Examples

This file demonstrates all the supported voice command formats and variations.

## Natural Language Format Examples

### Perfect Speech Recognition
```
"In the Purchases sheet, add a row with grass, 2 lbs, and 5 dollars"
→ {tabName: "purchases", item: "grass", qty: 2, pricePerKg: 5, status: "added"}
```

### Speech-to-Text Variations (all work!)
```
"in the purchases sheet add a row with grass 2 lbs and 5 dollars"  (no commas)
"In the Purchase sheet, add a row with grass, 2 pounds, and $5"     ($ symbol)
"in the inventory sheet add a row with apples 3.5 kg and 12 dollars" (decimal qty)
"In the Sales sheet, add a row with bananas, 1.2 kilograms, and 8$"  (different unit)
```

### Different Units Supported
```
"In the Food sheet, add a row with rice, 5 grams, and 3 dollars"
"In the Market sheet, add a row with flour, 2.5 ounces, and 7 dollars"  
"In the Store sheet, add a row with sugar, 1 oz, and 4 dollars"
"In the Kitchen sheet, add a row with salt, 500 g, and 2 dollars"
```

## Original Format Examples

### Standard Format
```
"Ara Hulk starburst 1 at 2100 owes"
→ {tabName: "hulk", item: "starburst", qty: 1, pricePerKg: 2100, status: "owes"}
```

### Various Status Options
```
"Ara Inventory apples 5 at 10 paid"
"Ara Sales bananas 3 at 15 pending"  
"Ara Market oranges 2 at 8 delivered"
```

## Error Cases

### Invalid Natural Language
```
"Add grass to purchases" → ERROR: Missing required pattern
"In purchases, grass 2 5" → ERROR: Incomplete format
```

### Invalid Original Format
```
"Ara only three words" → ERROR: Insufficient parameters
"Ara tab item notanumber at 5 status" → ERROR: Invalid quantity
```

## Testing Script

Use this bash script to test all examples:

```bash
#!/bin/bash
BASE_URL="http://localhost:10000/voice"
KEY="Bruins"

echo "Testing Natural Language Examples..."

# Test cases array
declare -a test_cases=(
  "In the Purchases sheet, add a row with grass, 2 lbs, and 5 dollars"
  "in the purchases sheet add a row with grass 2 lbs and 5 dollars"  
  "In the Purchase sheet, add a row with grass, 2 pounds, and \$5"
  "in the inventory sheet add a row with apples 3.5 kg and 12 dollars"
  "In the Sales sheet, add a row with bananas, 1.2 kilograms, and 8\$"
  "Ara Hulk starburst 1 at 2100 owes"
  "Invalid command format"
)

for i in "${!test_cases[@]}"; do
  echo "Test $((i+1)): ${test_cases[i]}"
  curl -X POST "$BASE_URL" \
    -H "Content-Type: application/json" \
    -d "{\"key\": \"$KEY\", \"transcript\": \"${test_cases[i]}\"}" \
    -w "\nStatus: %{http_code}\n"
  echo "---"
done
```