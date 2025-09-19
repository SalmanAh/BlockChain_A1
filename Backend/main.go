package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Block structure
type Block struct {
	Index      int      `json:"index"`
	Timestamp  int64    `json:"timestamp"`
	Txns       []string `json:"transactions"`
	MerkleRoot string   `json:"merkle_root"`
	PrevHash   string   `json:"prev_hash"`
	Hash       string   `json:"hash"`
	Nonce      int64    `json:"nonce"`
}

// Blockchain state
var (
	Blockchain []Block
	PendingTx  []string
	mutex      = &sync.Mutex{}
	Name       = "Salman Ahmed"
	Difficulty = 3 // leading zeros required
)

// Calculate SHA256 for input string
func calculateHash(input string) string {
	h := sha256.Sum256([]byte(input))
	return hex.EncodeToString(h[:])
}

// Merkle tree: compute merkle root from transactions
func computeMerkleRoot(txns []string) string {
	if len(txns) == 0 {
		return ""
	}
	// start with leaf hashes
	hashes := make([]string, len(txns))
	for i, t := range txns {
		hashes[i] = calculateHash(t)
	}
	// if odd number of hashes, duplicate last
	for len(hashes) > 1 {
		if len(hashes)%2 != 0 {
			hashes = append(hashes, hashes[len(hashes)-1])
		}
		next := []string{}
		for i := 0; i < len(hashes); i += 2 {
			combined := hashes[i] + hashes[i+1]
			next = append(next, calculateHash(combined))
		}
		hashes = next
	}
	return hashes[0]
}

// Create genesis block (with first transaction = roll number)
func createGenesisBlock() Block {
	txns := []string{"i22-0743"} // roll number as required
	merkle := computeMerkleRoot(txns)
	b := Block{
		Index:      0,
		Timestamp:  time.Now().Unix(),
		Txns:       txns,
		MerkleRoot: merkle,
		PrevHash:   "",
		Nonce:      0,
	}
	b.Hash = calculateBlockHash(b)
	return b
}

// Calculate block hash based on content
func calculateBlockHash(b Block) string {
	record := strconv.Itoa(b.Index) +
		strconv.FormatInt(b.Timestamp, 10) +
		strings.Join(b.Txns, "|") +
		b.MerkleRoot + b.PrevHash +
		strconv.FormatInt(b.Nonce, 10)
	return calculateHash(record)
}

// Proof-of-Work: find nonce such that hash has Difficulty leading zeros
func mineBlock(b Block) Block {
	target := strings.Repeat("0", Difficulty)
	for {
		b.Timestamp = time.Now().Unix()
		b.Hash = calculateBlockHash(b)
		if strings.HasPrefix(b.Hash, target) {
			return b
		}
		b.Nonce++
	}
}

// AddBlock with mining
func addBlock(txns []string) Block {
	mutex.Lock()
	defer mutex.Unlock()
	prev := Blockchain[len(Blockchain)-1]
	newBlock := Block{
		Index:    prev.Index + 1,
		Txns:     txns,
		PrevHash: prev.Hash,
	}
	newBlock.MerkleRoot = computeMerkleRoot(txns)
	mined := mineBlock(newBlock)
	Blockchain = append(Blockchain, mined)
	return mined
}

// --- Handlers ---

func withCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Content-Type", "application/json")
}

// getBlocks returns full blockchain
func getBlocksHandler(w http.ResponseWriter, r *http.Request) {
	withCORS(w)
	mutex.Lock()
	defer mutex.Unlock()
	json.NewEncoder(w).Encode(Blockchain)
}

// add transaction: POST {"data":"..."}
func addTransactionHandler(w http.ResponseWriter, r *http.Request) {
	withCORS(w)
	
	// Handle preflight OPTIONS request
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	
	if r.Method != "POST" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "method not allowed"})
		return
	}
	
	var body struct {
		Data string `json:"data"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid body"})
		return
	}
	mutex.Lock()
	PendingTx = append(PendingTx, body.Data)
	mutex.Unlock()
	json.NewEncoder(w).Encode(map[string]string{"status": "transaction added"})
}

// mine pending transactions
func mineHandler(w http.ResponseWriter, r *http.Request) {
	withCORS(w)
	mutex.Lock()
	if len(PendingTx) == 0 {
		mutex.Unlock()
		json.NewEncoder(w).Encode(map[string]string{"status": "no transactions to mine"})
		return
	}
	txns := make([]string, len(PendingTx))
	copy(txns, PendingTx)
	PendingTx = []string{}
	mutex.Unlock()

	mined := addBlock(txns)
	json.NewEncoder(w).Encode(mined)
}

// search transactions
func searchHandler(w http.ResponseWriter, r *http.Request) {
	withCORS(w)
	q := r.URL.Query().Get("q")
	if q == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "query required"})
		return
	}
	mutex.Lock()
	defer mutex.Unlock()
	results := []map[string]interface{}{}
	for _, b := range Blockchain {
		for _, t := range b.Txns {
			if strings.Contains(strings.ToLower(t), strings.ToLower(q)) {
				results = append(results, map[string]interface{}{
					"block_index": b.Index,
					"transaction": t,
					"block_hash":  b.Hash,
				})
			}
		}
	}
	json.NewEncoder(w).Encode(results)
}

// view pending
func pendingHandler(w http.ResponseWriter, r *http.Request) {
	withCORS(w)
	mutex.Lock()
	defer mutex.Unlock()
	json.NewEncoder(w).Encode(PendingTx)
}

func main() {
	// initialize blockchain with genesis block
	Genesis := createGenesisBlock()
	Blockchain = []Block{Genesis}
	PendingTx = []string{}

	http.HandleFunc("/blocks", getBlocksHandler)
	http.HandleFunc("/transactions", addTransactionHandler)
	http.HandleFunc("/mine", mineHandler)
	http.HandleFunc("/search", searchHandler)
	http.HandleFunc("/pending", pendingHandler)

	fmt.Println("Starting backend on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
