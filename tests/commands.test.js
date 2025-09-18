const { parseVoiceCommand } = require('../index');

describe('Voice Command Parsing Tests', () => {
  
  describe('parseVoiceCommand function', () => {
    test('should parse valid command with trigger phrase', () => {
      const command = 'people purple dance keyboard pig groceries apples 2.5 at 1200 pending';
      const result = parseVoiceCommand(command);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        tab: 'groceries',
        item: 'apples',
        qty: 2.5,
        price: 1200,
        status: 'pending'
      });
    });
    
    test('should parse command with different tab name', () => {
      const command = 'people purple dance keyboard pig shopping bananas 1.0 at 800 owes';
      const result = parseVoiceCommand(command);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        tab: 'shopping',
        item: 'bananas',
        qty: 1.0,
        price: 800,
        status: 'owes'
      });
    });
    
    test('should handle decimal quantities correctly', () => {
      const command = 'people purple dance keyboard pig groceries oranges 3.25 at 900 complete';
      const result = parseVoiceCommand(command);
      
      expect(result.success).toBe(true);
      expect(result.data.qty).toBe(3.25);
    });
    
    test('should fail when command is too short', () => {
      const command = 'people purple dance';
      const result = parseVoiceCommand(command);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Bad format');
    });
    
    test('should fail when trigger phrase is incorrect', () => {
      const command = 'wrong trigger phrase here groceries apples 2.5 at 1200 pending';
      const result = parseVoiceCommand(command);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Bad format');
    });
    
    test('should fail when missing "at" keyword', () => {
      const command = 'people purple dance keyboard pig groceries apples 2.5 1200 pending';
      const result = parseVoiceCommand(command);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid values');
    });
    
    test('should fail when quantity is not a number', () => {
      const command = 'people purple dance keyboard pig groceries apples abc at 1200 pending';
      const result = parseVoiceCommand(command);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid values');
    });
    
    test('should fail when price is not a number', () => {
      const command = 'people purple dance keyboard pig groceries apples 2.5 at xyz pending';
      const result = parseVoiceCommand(command);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid values');
    });
    
    test('should fail when tab name is missing', () => {
      const command = 'people purple dance keyboard pig  apples 2.5 at 1200 pending';
      const result = parseVoiceCommand(command);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid values');
    });
    
    test('should fail when item name is missing', () => {
      const command = 'people purple dance keyboard pig groceries  2.5 at 1200 pending';
      const result = parseVoiceCommand(command);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid values');
    });
    
    test('should fail when status is missing', () => {
      const command = 'people purple dance keyboard pig groceries apples 2.5 at 1200';
      const result = parseVoiceCommand(command);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid values');
    });
    
    test('should handle empty or null input gracefully', () => {
      const emptyResult = parseVoiceCommand('');
      expect(emptyResult.success).toBe(false);
      expect(emptyResult.error).toContain('Invalid command input');
      
      const nullResult = parseVoiceCommand(null);
      expect(nullResult.success).toBe(false);
      expect(nullResult.error).toBe('Invalid command input');
    });
    
    test('should handle whitespace in command', () => {
      const command = '  people   purple   dance   keyboard   pig   groceries   apples   2.5   at   1200   pending  ';
      const result = parseVoiceCommand(command);
      
      expect(result.success).toBe(true);
      expect(result.data.tab).toBe('groceries');
      expect(result.data.item).toBe('apples');
    });
    
    test('should be case insensitive for trigger phrase', () => {
      const command = 'PEOPLE PURPLE DANCE KEYBOARD PIG groceries apples 2.5 at 1200 pending';
      const result = parseVoiceCommand(command);
      
      expect(result.success).toBe(true);
      expect(result.data.tab).toBe('groceries');
    });
    
    test('should handle mixed case in other parts', () => {
      const command = 'people purple dance keyboard pig GROCERIES APPLES 2.5 at 1200 PENDING';
      const result = parseVoiceCommand(command);
      
      expect(result.success).toBe(true);
      expect(result.data.tab).toBe('groceries'); // Should be lowercase
      expect(result.data.item).toBe('apples');
      expect(result.data.status).toBe('pending');
    });
  });
  
  describe('Edge Cases', () => {
    test('should handle very small quantities', () => {
      const command = 'people purple dance keyboard pig groceries spice 0.1 at 5000 pending';
      const result = parseVoiceCommand(command);
      
      expect(result.success).toBe(true);
      expect(result.data.qty).toBe(0.1);
    });
    
    test('should handle very large prices', () => {
      const command = 'people purple dance keyboard pig groceries gold 1.0 at 999999 pending';
      const result = parseVoiceCommand(command);
      
      expect(result.success).toBe(true);
      expect(result.data.price).toBe(999999);
    });
    
    test('should handle zero quantities as invalid', () => {
      const command = 'people purple dance keyboard pig groceries nothing 0 at 100 pending';
      const result = parseVoiceCommand(command);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid values');
    });
    
    test('should handle negative values as invalid', () => {
      const command = 'people purple dance keyboard pig groceries debt -2.5 at 1200 pending';
      const result = parseVoiceCommand(command);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid values');
    });
  });
});