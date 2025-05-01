#!/usr/bin/env python3
"""
Script to create Anki deck using genanki
Install with: pip install genanki
Run with: python create-anki-deck.py word_pairs.json output.apkg [deck_name]
"""

import genanki
import json
import sys
import os
import random
import io
import argparse

# Set UTF-8 as default encoding for all file operations
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Default CSS style for cards
DEFAULT_CSS = """
.card {
    font-family: Arial;
    font-size: 20px;
    text-align: center;
    color: black;
    background-color: white;
}
.front {
    font-size: 28px;
    font-weight: bold;
    color: #333333;
    margin-bottom: 20px;
}
.back {
    font-size: 24px;
    color: #0066cc;
}
"""

# Default templates for cards
DEFAULT_TEMPLATES = [
    {
        'name': 'Card 1',
        'qfmt': '<div class="front">{{Front}}</div>',
        'afmt': '<div class="front">{{Front}}</div><hr id="answer"><div class="back">{{Back}}</div>',
    }
]

def create_anki_deck(deck_name, word_pairs, output_file, css=None, templates=None):
    """Create an Anki deck with the given word pairs"""
    # Generate random IDs for the model and deck
    model_id = random.randrange(1 << 30, 1 << 31)
    deck_id = random.randrange(1 << 30, 1 << 31)
    
    # Use default or custom CSS/templates
    css = css or DEFAULT_CSS
    templates = templates or DEFAULT_TEMPLATES
    
    # Create model (note type)
    model = genanki.Model(
        model_id,
        'Hungarian Words',
        fields=[
            {'name': 'Front'},
            {'name': 'Back'},
        ],
        templates=templates,
        css=css
    )
    
    # Create deck
    deck = genanki.Deck(deck_id, deck_name)
    
    # Add notes to deck
    for pair in word_pairs:
        front = pair['front']
        back = pair['back']
        
        try:
            # Create a note ID from the word content to make it stable
            note_id = random.randrange(1 << 30, 1 << 31)
            
            note = genanki.Note(
                model=model,
                fields=[front, back],
                guid=str(note_id)
            )
            deck.add_note(note)
        except Exception:
            # Skip problematic cards silently
            pass
    
    # Generate package
    package = genanki.Package(deck)
    
    # Write to file
    package.write_to_file(output_file)

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Create Anki deck from word pairs')
    parser.add_argument('input_file', help='JSON file with word pairs')
    parser.add_argument('output_file', help='Output APKG file')
    parser.add_argument('--deck-name', '-n', default='Hungarian Words', help='Name of the deck')
    parser.add_argument('--css-file', '-c', help='CSS file for styling cards')
    parser.add_argument('--quiet', '-q', action='store_true', help='Suppress output')
    
    return parser.parse_args()

def main():
    """Main function"""
    args = parse_args()
    
    # If input file is provided, use it
    if args.input_file:
        try:
            # Read word pairs from JSON file
            with open(args.input_file, 'r', encoding='utf-8') as f:
                word_pairs = json.load(f)
            
            # Read custom CSS if provided
            css = None
            if args.css_file and os.path.exists(args.css_file):
                with open(args.css_file, 'r', encoding='utf-8') as f:
                    css = f.read()
            
            # Create deck
            create_anki_deck(args.deck_name, word_pairs, args.output_file, css)
            
            if not args.quiet:
                print(f"Created deck '{args.deck_name}' with {len(word_pairs)} cards in {args.output_file}")
                
            return 0
        except Exception as e:
            if not args.quiet:
                print(f"Error: {str(e)}")
            return 1
    else:
        # Display help if no arguments
        parser.print_help()
        return 1

if __name__ == "__main__":
    sys.exit(main()) 