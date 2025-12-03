package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"strings"
	"syscall/js"
)

func sayHello() js.Func {
	fmt.Println("Hello, I'm Go WASM Module!")
	return js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		return "Hello from Go!"
	})
}

func parseCSV() js.Func {
	return js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		if len(args) < 1 {
			return js.ValueOf(map[string]interface{}{
				"error": "parseCSV: missing argument (expected CSV string)",
			})
		}

		csvText := args[0].String()
		reader := csv.NewReader(strings.NewReader(csvText))
		reader.TrimLeadingSpace = true

		records, err := reader.ReadAll()
		if err != nil {
			return js.ValueOf(map[string]interface{}{
				"error": err.Error(),
			})
		}

		if len(records) == 0 {
			return js.ValueOf(map[string]interface{}{
				"error": "CSV is empty",
			})
		}

		headers := records[0]
		rows := []map[string]string{}

		for _, record := range records[1:] {
			row := map[string]string{}
			for i, h := range headers {
				if i < len(record) {
					row[strings.TrimSpace(h)] = strings.TrimSpace(record[i])
				} else {
					row[strings.TrimSpace(h)] = ""
				}
			}
			rows = append(rows, row)
		}

		result := map[string]interface{}{
			"headers": headers,
			"rows":    rows,
		}

		jsonBytes, _ := json.Marshal(result)
		return js.ValueOf(string(jsonBytes))
	})
}

func main() {
	js.Global().Set("parseCSV", parseCSV())
	js.Global().Set("sayHello", sayHello())
	select {} // keep WASM alive
}
