#!/usr/bin/python2.7
"""
Read a vim history file and transform it to a list
"""

import struct

FILE = "test/%Users%pomier%projects%vichy%client%history%test.txt"
UF_ENTRY_MAGIC = 0xf518
UF_HEADER_MAGIC = 0x5fd0
UF_START_MAGIC = "Vim\237UnDo\345"
NMARKS = 26

class Header:
    """Represents a list of list in vim history"""

    def __init__(self):
        self.next_seq = 0
        self.prev_seq = 0
        self.alt_next_seq = 0
        self.alt_prev_seq = 0
        self.seq = 0
        self.cursor = None
        self.cursor_vcol = 0
        self.uh_flags = 0
        self.uh_visual = None
        self.entries = []

    def __str__(self):
        s = "Seq: %d - Prev: %d - Next: %d"%(self.seq, self.prev_seq, self.next_seq)
        return s


class Pos:
    """Represents the position of the header"""

    def __init__(self):
        self.lnum = 0
        self.col = 0
        self.coladd = 0

    def __str__(self):
        s = "Line %d, Col %d, Coladd %d"%(self.lnum, self.col, self.coladd)
        return s


class Entry:
    """Contains the information for one undo or redo."""

    def __init__(self):
        self.top = 0
        #self.bot == 0 means the end of the document
        self.bot = 0
        self.lcount = 0
        self.size = 0
        self.array = []

    def __str__(self):
        s = ""
        if self.bot == 0:
            s += "Remove lines from line %d to the end\n"%(self.top+1)
        if self.bot == self.top + 1:
            s += "Remove line %d\n"%(self.top+1)
        elif self.top < self.bot:
            s += "Remove lines %d to %d\n"%(self.top+1, self.bot-1)
        if len(self.array) > 0:
            s += "Add the following %d line(s) at line %d"%(self.size, self.top+1)
        for l in self.array:
            s += "\n%s"%(l)
        return s

    def __repr__(self):
        s = ""
        if self.bot == 0:
            s += "Remove %d to end - "%(self.top+1)
        if self.bot == self.top + 1:
            s += "Remove %d - "%(self.top+1)
        elif self.top < self.bot:
            s += "Remove %d to %d - "%(self.top+1, self.bot-1)
        if len(self.array) > 0:
            s += "Add at %d: "%(self.top+1)
        for l in self.array:
            s += "\\n%s"%(l)
        return s

class VisualInfo:
    def __init__(self):
        self.vi_start = None
        self.vi_end = None
        self.vi_mode = 0
        self.vi_curswant = 0


class HistoryFile:
    def __init__(self, name):
        f = open(name, 'rb')
        self.content = bytearray(f.read())
        self.length = len(self.content)
        self.pointer = 0
        self.old_header_seq = 0;
        self.new_header_seq = 0;
        self.cur_header_seq = 0;
        self.num_head = 0;
        self.seq_last = 0;
        self.seq_cur = 0;
        self.header = {}


    def read(self, n):
        result = self.content[self.pointer:self.pointer+n]
        self.pointer += n
        return result

    def find_next_constant(self, v1, v2):
        while self.pointer + 1 < self.length:
            if self.content[self.pointer] == v1 and self.content[self.pointer+1] == v2:
                return True
            self.pointer += 1
        return False

    def is_finished(self, n):
        return self.pointer + n > self.length

    def is_constant(self, v1, v2):
        if self.pointer + 1 >= self.length:
            return False
        if self.content[self.pointer] == v1 and self.content[self.pointer+1] == v2:
            self.pointer += 2
            return True
        else:
            self.pointer += 2
            return False

    def get_double(self):
        return struct.unpack_from('d', buffer(self.read(8)[::-1]))[0]
    
    def get_int(self):
        return struct.unpack_from('i', buffer(self.read(4)[::-1]))[0]
    
    def get_short(self):
        return struct.unpack_from('H', buffer(self.read(2)[::-1]))[0]
    
    def get_char(self):
        return struct.unpack_from('b', buffer(self.read(1)[::-1]))[0]
    
    def get_header(self):
        """Get the next header of the file"""
        uhp = Header()
        uhp.next_seq = self.get_int()
        uhp.prev_seq = self.get_int()
        uhp.alt_next_seq = self.get_int()
        uhp.alt_prev_seq = self.get_int()
        uhp.seq = self.get_int()
        if uhp.seq <= 0:
           print "Error"
           return
    
        uhp.cursor = self.get_pos()
        uhp.cursor_vcol = self.get_int()
        uhp.uh_flags = self.get_short()
    
        uhp.uh_visual = self.get_visual()
    
        self.find_next_constant(245, 24)
        while self.is_constant(245, 24):
            uep = self.get_entry()
            uhp.entries.append(uep)
    
        return uhp
    
    def get_pos(self):
        """Get position in history"""
        pos = Pos()
        pos.lnum = self.get_int()
        pos.col = self.get_int()
        pos.coladd = self.get_int()
        return pos
    
    def get_entry(self):
        """Get the next entry of the file"""
        uep = Entry()
        uep.top = self.get_int()
        uep.bot = self.get_int()
        uep.lcount = self.get_int()
        uep.size = self.get_int()
        for i in range(uep.size):
            line_length = self.get_int()
            uep.array.append(f.read(line_length))
        return uep
    
    def get_visual(self):
        v = VisualInfo()
        v.vi_start = self.get_pos()
        v.vi_end = self.get_pos()
        v.vi_mode = self.get_int()
        v.vi_curswant = self.get_int()
        return v
    
    def read_file(self):
        start = self.read(len(UF_START_MAGIC))
        if start != UF_START_MAGIC:
            print "Not a vim history file"
            return
    
        #Version
        self.get_short()
        #Hash
        self.read(32)
    
        nb_lines = self.get_int()
    
        #Undo data for U
        str_len = self.get_int()
        if str_len > 0:
            s = f.read(str_len)
            ln = self.get_int()
            cn = self.get_int()
            print "Init text:\n%s"%(s)
    
        self.old_header_seq = self.get_int();
        self.new_header_seq = self.get_int();
        self.cur_header_seq = self.get_int();
        self.num_head = self.get_int();
        self.seq_last = self.get_int();
        print "Last seq: %d"%(self.seq_last)
        self.seq_cur = self.get_int();
    
        self.headers = {}
        while self.find_next_constant(95, 208):
            self.is_constant(95, 208)
            uhp = self.get_header()
            print "\n---------\nNew header\n---------"
            print uhp
            print ""
            k = 0
            for i in uhp.entries:
                print "Entry %d"%(k)
                print i
                k += 1
            self.headers[uhp.seq] = uhp

    def get_chain_of_modifications(self):
        """Returns the lists of modifications
           [undo, redo]
           undo: upcoming undo
           redo: upcoming redo"""

        undo = []
        redo = []
        current_seq = self.cur_header_seq
        while current_seq != 0 and current_seq != self.seq_last:
            if current_seq not in self.headers.keys():
                break
            cur = self.headers[current_seq]
            for entry in cur.entries[::-1]:
                undo.append(entry)
            current_seq = cur.prev_seq
        undo.reverse()

        while current_seq != 0:
            if current_seq not in self.headers.keys():
                break
            cur = self.headers[current_seq]
            for entry in cur.entries:
                redo.append(entry)
            current_seq = cur.prev_seq

        return [undo, redo]


if __name__ == '__main__':
    f = HistoryFile(FILE)
    f.read_file()
    print f.get_chain_of_modifications()
