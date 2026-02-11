import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  contactInfo: {
    fontSize: 10,
    color: '#666',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    textTransform: 'uppercase',
  },
  bulletPoint: {
    fontSize: 10,
    marginBottom: 4,
    paddingLeft: 10,
  },
  bullet: {
    position: 'absolute',
    left: 0,
  },
  bulletContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bulletText: {
    fontSize: 10,
    flex: 1,
    paddingLeft: 8,
  },
  summary: {
    fontSize: 10,
    marginBottom: 20,
    fontStyle: 'italic',
    color: '#444',
  },
});

interface Section {
  title: string;
  tailoredBullets: string[];
}

interface ResumeDocumentProps {
  sections: Section[];
  originalResumeText?: string;
}

function ResumeDocument({ sections }: ResumeDocumentProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>Tailored Resume</Text>
          <Text style={styles.contactInfo}>
            Generated with Resume Tailor
          </Text>
        </View>

        {sections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.tailoredBullets.map((bullet, bulletIndex) => (
              <View key={bulletIndex} style={styles.bulletContainer}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function generateResumePDF(sections: Section[]): Promise<Buffer> {
  const buffer = await renderToBuffer(<ResumeDocument sections={sections} />);
  return Buffer.from(buffer);
}
